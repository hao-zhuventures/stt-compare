import type { Segment } from '@/types'

interface GladiaWord {
  word: string
  start: number
  end: number
  confidence: number
}

interface GladiaUtterance {
  speaker: number
  language: string
  words: GladiaWord[]
}

interface GladiaResponse {
  result: {
    transcription: {
      utterances: GladiaUtterance[]
    }
  }
}

export function normalizeGladia(raw: GladiaResponse): Segment[] {
  const utterances = raw.result.transcription.utterances
  if (utterances.length === 0) return []

  return utterances.map((utt) => ({
    speaker: `Speaker ${utt.speaker}`,
    speaker_id: utt.speaker,
    language: utt.language,
    words: utt.words.map((w) => ({
      text: w.word,
      start_timestamp: w.start,
      end_timestamp: w.end,
      confidence: w.confidence,
      language: null,
    })),
  }))
}
