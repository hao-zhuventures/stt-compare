import type { Segment } from '@/types'

interface WhisperWord {
  word: string
  start: number
  end: number
  probability: number
}

interface WhisperSegment {
  id: number
  text: string
  start: number
  end: number
  words: WhisperWord[]
}

interface OpenAITranscriptionResponse {
  segments: WhisperSegment[]
}

export function normalizeOpenAI(raw: OpenAITranscriptionResponse): Segment[] {
  if (raw.segments.length === 0) return []

  return raw.segments.map((seg) => ({
    speaker: 'Speaker 0',
    speaker_id: 0,
    language: '',
    words: seg.words.map((w) => ({
      text: w.word.trimStart(),
      start_timestamp: w.start,
      end_timestamp: w.end,
      confidence: w.probability,
      language: null,
    })),
  }))
}
