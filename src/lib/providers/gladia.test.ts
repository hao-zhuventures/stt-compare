import { describe, it, expect } from 'vitest'
import { normalizeGladia } from './gladia'

const mockResponse = {
  result: {
    transcription: {
      utterances: [
        {
          speaker: 0,
          language: 'en',
          words: [
            { word: 'hello', start: 0.0, end: 0.5, confidence: 0.99 },
            { word: 'world', start: 0.5, end: 1.0, confidence: 0.88 },
          ],
        },
        {
          speaker: 1,
          language: 'fr',
          words: [{ word: 'bonjour', start: 1.0, end: 1.5, confidence: 0.95 }],
        },
      ],
    },
  },
}

describe('normalizeGladia', () => {
  it('creates one segment per utterance', () => {
    const segments = normalizeGladia(mockResponse)
    expect(segments).toHaveLength(2)
  })

  it('maps speaker_id and formats speaker label', () => {
    const segments = normalizeGladia(mockResponse)
    expect(segments[0].speaker_id).toBe(0)
    expect(segments[0].speaker).toBe('Speaker 0')
    expect(segments[1].speaker_id).toBe(1)
  })

  it('uses utterance language as segment language', () => {
    const segments = normalizeGladia(mockResponse)
    expect(segments[0].language).toBe('en')
    expect(segments[1].language).toBe('fr')
  })

  it('maps word fields correctly', () => {
    const segments = normalizeGladia(mockResponse)
    const word = segments[0].words[0]
    expect(word.text).toBe('hello')
    expect(word.start_timestamp).toBe(0.0)
    expect(word.end_timestamp).toBe(0.5)
    expect(word.confidence).toBe(0.99)
    expect(word.language).toBeNull()
  })

  it('returns empty array for empty utterances', () => {
    const empty = { result: { transcription: { utterances: [] } } }
    expect(normalizeGladia(empty)).toEqual([])
  })
})
