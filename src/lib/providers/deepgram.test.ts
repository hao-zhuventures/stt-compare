import { describe, it, expect } from 'vitest'
import { normalizeDeepgram } from './deepgram'

const mockResponse = {
  results: {
    channels: [
      {
        alternatives: [
          {
            words: [
              {
                word: 'hello',
                start: 0.0,
                end: 0.5,
                confidence: 0.99,
                speaker: 0,
                language: 'en',
              },
              {
                word: 'world',
                start: 0.5,
                end: 1.0,
                confidence: 0.87,
                speaker: 0,
                language: 'en',
              },
              {
                word: 'bonjour',
                start: 1.0,
                end: 1.5,
                confidence: 0.95,
                speaker: 1,
                language: 'fr',
              },
            ],
          },
        ],
      },
    ],
  },
}

describe('normalizeDeepgram', () => {
  it('groups consecutive words by speaker into segments', () => {
    const segments = normalizeDeepgram(mockResponse)
    expect(segments).toHaveLength(2)
    expect(segments[0].speaker_id).toBe(0)
    expect(segments[1].speaker_id).toBe(1)
  })

  it('maps word fields correctly', () => {
    const segments = normalizeDeepgram(mockResponse)
    const word = segments[0].words[0]
    expect(word.text).toBe('hello')
    expect(word.start_timestamp).toBe(0.0)
    expect(word.end_timestamp).toBe(0.5)
    expect(word.confidence).toBe(0.99)
    expect(word.language).toBe('en')
  })

  it('sets segment language from first word', () => {
    const segments = normalizeDeepgram(mockResponse)
    expect(segments[0].language).toBe('en')
    expect(segments[1].language).toBe('fr')
  })

  it('formats speaker label as "Speaker N"', () => {
    const segments = normalizeDeepgram(mockResponse)
    expect(segments[0].speaker).toBe('Speaker 0')
    expect(segments[1].speaker).toBe('Speaker 1')
  })

  it('returns empty array for empty words', () => {
    const empty = { results: { channels: [{ alternatives: [{ words: [] }] }] } }
    expect(normalizeDeepgram(empty)).toEqual([])
  })

  it('handles missing language on words (null)', () => {
    const noLang = {
      results: {
        channels: [
          {
            alternatives: [
              {
                words: [
                  { word: 'test', start: 0, end: 1, confidence: 0.9, speaker: 0 },
                ],
              },
            ],
          },
        ],
      },
    }
    const segments = normalizeDeepgram(noLang)
    expect(segments[0].words[0].language).toBeNull()
  })
})
