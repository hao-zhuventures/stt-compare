export type ProviderName =
  | 'deepgram'
  | 'gladia'
  | 'assemblyai'
  | 'speechmatics'
  | 'google'
  | 'openai'

export type JobStatus = 'pending' | 'running' | 'done' | 'error'

export interface Recording {
  id: string
  filename: string
  storage_path: string | null
  duration_s: number | null
  created_at: string
}

export interface TranscriptionJob {
  id: string
  recording_id: string
  provider: ProviderName
  status: JobStatus
  error_msg: string | null
  created_at: string
  completed_at: string | null
}

export interface Transcript {
  id: string
  job_id: string
  segments: Segment[]
  metrics: Metrics
  created_at: string
}

export interface Metrics {
  wordCount: number
  avgConfidence: number
  languagesDetected: string[]
  processingTimeMs: number
}

export interface Word {
  text: string
  start_timestamp: number
  end_timestamp: number
  language: string | null
  confidence: number
}

export interface Segment {
  speaker: string
  speaker_id: number
  language: string
  words: Word[]
}
