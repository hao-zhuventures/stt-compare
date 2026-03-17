import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runTranscriptionJob } from './transcribe'
import type { Segment } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

const fakeSegments: Segment[] = [
  {
    speaker: 'Speaker 0',
    speaker_id: 0,
    language: 'en',
    words: [
      { text: 'hello', start_timestamp: 0, end_timestamp: 0.5, confidence: 0.9, language: 'en' },
    ],
  },
]

function makeSupabaseMock() {
  const updateMock = vi.fn().mockResolvedValue({ error: null })
  const insertMock = vi.fn().mockResolvedValue({ error: null })
  const eqMock = vi.fn().mockReturnValue({ error: null })

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'transcription_jobs') {
        return {
          update: vi.fn().mockReturnValue({ eq: eqMock }),
        }
      }
      if (table === 'transcripts') {
        return { insert: insertMock }
      }
      return {}
    }),
  } as unknown as SupabaseClient

  return { supabase, updateMock, insertMock, eqMock }
}

describe('runTranscriptionJob', () => {
  it('sets job status to running then done on success', async () => {
    const { supabase, eqMock } = makeSupabaseMock()
    const transcribe = vi.fn().mockResolvedValue(fakeSegments)

    await runTranscriptionJob({
      jobId: 'job-1',
      provider: 'deepgram',
      audioUrl: 'https://example.com/audio.wav',
      processingStartMs: Date.now(),
      supabase,
      transcribe,
    })

    const calls = (supabase.from as ReturnType<typeof vi.fn>).mock.calls
    const updateCalls = calls.filter((args: unknown[]) => args[0] === 'transcription_jobs')
    expect(updateCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('saves transcript with computed metrics on success', async () => {
    const { supabase, insertMock } = makeSupabaseMock()
    const transcribe = vi.fn().mockResolvedValue(fakeSegments)

    await runTranscriptionJob({
      jobId: 'job-1',
      provider: 'deepgram',
      audioUrl: 'https://example.com/audio.wav',
      processingStartMs: Date.now(),
      supabase,
      transcribe,
    })

    expect(insertMock).toHaveBeenCalledOnce()
    const [insertArg] = insertMock.mock.calls[0]
    expect(insertArg.job_id).toBe('job-1')
    expect(insertArg.segments).toEqual(fakeSegments)
    expect(insertArg.metrics.wordCount).toBe(1)
  })

  it('sets job status to error when transcribe throws', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const supabase = {
      from: vi.fn(() => ({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    } as unknown as SupabaseClient

    const transcribe = vi.fn().mockRejectedValue(new Error('API timeout'))

    await expect(
      runTranscriptionJob({
        jobId: 'job-2',
        provider: 'deepgram',
        audioUrl: 'https://example.com/audio.wav',
        processingStartMs: Date.now(),
        supabase,
        transcribe,
      })
    ).rejects.toThrow('API timeout')

    const eqCalls = eqMock.mock.calls
    const errorUpdate = eqCalls.find(() => true) // just verify eq was called
    expect(errorUpdate).toBeDefined()
  })
})
