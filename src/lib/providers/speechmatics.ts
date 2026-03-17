import type { Segment, Word } from '@/types'

interface SpeechmaticsAlternative {
  content: string
  confidence: number
  language?: string
}

interface SpeechmaticsResult {
  type: 'word' | 'punctuation'
  start_time: number
  end_time: number
  alternatives: SpeechmaticsAlternative[]
}

interface SpeechmaticsDiarizationResult {
  speaker_name: string
  start_time: number
  end_time: number
}

interface SpeechmaticsResponse {
  results: SpeechmaticsResult[]
  speaker_diarisation_results: SpeechmaticsDiarizationResult[]
}

export function normalizeSpeechmatics(raw: SpeechmaticsResponse): Segment[] {
  const words = raw.results
    .filter((r) => r.type === 'word')
    .map((r) => ({
      text: r.alternatives[0].content,
      start_timestamp: r.start_time,
      end_timestamp: r.end_time,
      confidence: r.alternatives[0].confidence,
      language: r.alternatives[0].language ?? null,
    }))

  if (words.length === 0) return []

  const diarization = raw.speaker_diarisation_results
  if (diarization.length === 0) {
    return [
      {
        speaker: 'Speaker 0',
        speaker_id: 0,
        language: words[0].language ?? '',
        words,
      },
    ]
  }

  const speakerIndex = new Map<string, number>()
  const segments: Segment[] = []

  for (const span of diarization) {
    if (!speakerIndex.has(span.speaker_name)) {
      speakerIndex.set(span.speaker_name, speakerIndex.size)
    }
    const speaker_id = speakerIndex.get(span.speaker_name)!

    const spanWords: Word[] = words.filter(
      (w) => w.start_timestamp >= span.start_time && w.end_timestamp <= span.end_time
    )

    if (spanWords.length === 0) continue

    segments.push({
      speaker: `Speaker ${span.speaker_name}`,
      speaker_id,
      language: spanWords[0].language ?? '',
      words: spanWords,
    })
  }

  return segments
}
