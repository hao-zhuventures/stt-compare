import type { Segment } from '@/types'

interface AssemblyAIWord {
  text: string
  start: number
  end: number
  confidence: number
  speaker: string
}

interface AssemblyAIUtterance {
  speaker: string
  words: AssemblyAIWord[]
}

interface AssemblyAIResponse {
  utterances: AssemblyAIUtterance[] | null
}

export function normalizeAssemblyAI(raw: AssemblyAIResponse): Segment[] {
  if (!raw.utterances) return []

  const speakerIndex = new Map<string, number>()

  return raw.utterances.map((utt) => {
    if (!speakerIndex.has(utt.speaker)) {
      speakerIndex.set(utt.speaker, speakerIndex.size)
    }
    const speaker_id = speakerIndex.get(utt.speaker)!

    return {
      speaker: `Speaker ${utt.speaker}`,
      speaker_id,
      language: '',
      words: utt.words.map((w) => ({
        text: w.text,
        start_timestamp: w.start / 1000,
        end_timestamp: w.end / 1000,
        confidence: w.confidence,
        language: null,
      })),
    }
  })
}
