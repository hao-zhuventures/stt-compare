import { describe, it, expect } from 'vitest'
import { normalizeAssemblyAI } from './assemblyai'

const mockResponse = {
  utterances: [
    {
      speaker: 'A',
      words: [
        { text: 'hello', start: 0, end: 500, confidence: 0.99, speaker: 'A' },
        { text: 'world', start: 500, end: 1000, confidence: 0.88, speaker: 'A' },
      ],
    },
    {
      speaker: 'B',
      words: [
        { text: 'hi', start: 1000, end: 1200, confidence: 0.95, speaker: 'B' },
      ],
    },
  ],
}

describe('normalizeAssemblyAI', () => {
  it('creates one segment per utterance', () => {
    const segments = normalizeAssemblyAI(mockResponse)
    expect(segments).toHaveLength(2)
  })

  it('maps speaker labels to speaker_id by alphabetic index', () => {
    const segments = normalizeAssemblyAI(mockResponse)
    expect(segments[0].speaker_id).toBe(0)
    expect(segments[0].speaker).toBe('Speaker A')
    expect(segments[1].speaker_id).toBe(1)
    expect(segments[1].speaker).toBe('Speaker B')
  })

  it('converts timestamps from ms to seconds', () => {
    const segments = normalizeAssemblyAI(mockResponse)
    const word = segments[0].words[0]
    expect(word.start_timestamp).toBe(0)
    expect(word.end_timestamp).toBe(0.5)
  })

  it('maps word fields correctly', () => {
    const segments = normalizeAssemblyAI(mockResponse)
    const word = segments[0].words[0]
    expect(word.text).toBe('hello')
    expect(word.confidence).toBe(0.99)
    expect(word.language).toBeNull()
  })

  it('returns empty array when utterances is null', () => {
    expect(normalizeAssemblyAI({ utterances: null })).toEqual([])
  })
})
