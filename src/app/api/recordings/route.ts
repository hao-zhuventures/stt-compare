import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import type { ProviderName } from '@/types'

const ALL_PROVIDERS: ProviderName[] = [
  'deepgram',
  'gladia',
  'assemblyai',
  'speechmatics',
  'google',
  'openai',
]

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const supabase = createServerClient()
  const storagePath = `recordings/${crypto.randomUUID()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from('audio')
    .upload(storagePath, file)

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: recording, error: insertError } = await supabase
    .from('recordings')
    .insert({ filename: file.name, storage_path: storagePath })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('audio').getPublicUrl(storagePath)
  const audioUrl = urlData.publicUrl

  // Create jobs for all providers
  const { data: jobs, error: jobsError } = await supabase
    .from('transcription_jobs')
    .insert(
      ALL_PROVIDERS.map((provider) => ({
        recording_id: recording.id,
        provider,
      }))
    )
    .select()

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 })
  }

  // Fan out Inngest events
  await inngest.send(
    jobs.map((job: { id: string; provider: ProviderName }) => ({
      name: 'stt/job.requested' as const,
      data: { jobId: job.id, provider: job.provider, audioUrl },
    }))
  )

  return NextResponse.json({ recording, jobs }, { status: 201 })
}
