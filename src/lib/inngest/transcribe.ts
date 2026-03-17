import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProviderName, Segment } from '@/types'
import { computeMetrics } from '@/lib/metrics'

interface RunTranscriptionJobOptions {
  jobId: string
  provider: ProviderName
  audioUrl: string
  processingStartMs: number
  supabase: SupabaseClient
  transcribe: (provider: ProviderName, audioUrl: string) => Promise<Segment[]>
}

export async function runTranscriptionJob({
  jobId,
  provider,
  audioUrl,
  processingStartMs,
  supabase,
  transcribe,
}: RunTranscriptionJobOptions): Promise<void> {
  await supabase
    .from('transcription_jobs')
    .update({ status: 'running' })
    .eq('id', jobId)

  let segments: Segment[]
  try {
    segments = await transcribe(provider, audioUrl)
  } catch (err) {
    const error_msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from('transcription_jobs')
      .update({ status: 'error', error_msg })
      .eq('id', jobId)
    throw err
  }

  const processingTimeMs = Date.now() - processingStartMs
  const metrics = computeMetrics(segments, processingTimeMs)

  await supabase.from('transcripts').insert({ job_id: jobId, segments, metrics })

  await supabase
    .from('transcription_jobs')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', jobId)
}
