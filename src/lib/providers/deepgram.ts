import type { Segment, Word } from '@/types'

interface DeepgramWord {
  word: string
  start: number
  end: number
  confidence: number
  speaker?: number
  language?: string
}

interface DeepgramResponse {
  results: {
    channels: Array<{
      alternatives: Array<{
        words: DeepgramWord[]
      }>
    }>
  }
}

export function normalizeDeepgram(raw: DeepgramResponse): Segment[] {
  const words = raw.results.channels[0]?.alternatives[0]?.words ?? []
  if (words.length === 0) return []

  const segments: Segment[] = []
  let currentSpeaker = words[0].speaker ?? 0
  let currentWords: Word[] = []

  for (const w of words) {
    const speakerId = w.speaker ?? 0
    if (speakerId !== currentSpeaker && currentWords.length > 0) {
      segments.push({
        speaker: `Speaker ${currentSpeaker}`,
        speaker_id: currentSpeaker,
        language: currentWords[0].language ?? '',
        words: currentWords,
      })
      currentSpeaker = speakerId
      currentWords = []
    }
    currentWords.push({
      text: w.word,
      start_timestamp: w.start,
      end_timestamp: w.end,
      confidence: w.confidence,
      language: w.language ?? null,
    })
  }

  if (currentWords.length > 0) {
    segments.push({
      speaker: `Speaker ${currentSpeaker}`,
      speaker_id: currentSpeaker,
      language: currentWords[0].language ?? '',
      words: currentWords,
    })
  }

  return segments
}
