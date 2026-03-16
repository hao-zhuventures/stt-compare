import { describe, it, expectTypeOf } from 'vitest'
import type { Recording, TranscriptionJob, ProviderName, JobStatus, Metrics } from './index'

describe('types', () => {
  it('ProviderName covers all 6 providers', () => {
    const providers: ProviderName[] = [
      'deepgram', 'gladia', 'assemblyai', 'speechmatics', 'google', 'openai'
    ]
    expectTypeOf(providers[0]).toMatchTypeOf<ProviderName>()
  })

  it('JobStatus covers all 4 states', () => {
    const statuses: JobStatus[] = ['pending', 'running', 'done', 'error']
    expectTypeOf(statuses[0]).toMatchTypeOf<JobStatus>()
  })
})
