import { inngest } from './client'
import { createServerClient } from '@/lib/supabase/server'
import { transcribe } from '@/lib/providers/transcribe'
import { runTranscriptionJob } from './transcribe'
import type { ProviderName } from '@/types'

export const transcriptionFunction = inngest.createFunction(
  { id: 'transcribe-recording', concurrency: { limit: 10 } },
  { event: 'stt/job.requested' },
  async ({ event }) => {
    const { jobId, provider, audioUrl } = event.data as {
      jobId: string
      provider: ProviderName
      audioUrl: string
    }

    const supabase = createServerClient()
    const processingStartMs = Date.now()

    await runTranscriptionJob({
      jobId,
      provider,
      audioUrl,
      processingStartMs,
      supabase,
      transcribe,
    })
  }
)
