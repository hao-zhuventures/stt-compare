import { describe, it, expect } from 'vitest'
import { normalizeSpeechmatics } from './speechmatics'

const mockResponse = {
  results: [
    {
      type: 'word' as const,
      start_time: 0.0,
      end_time: 0.5,
      alternatives: [{ content: 'hello', confidence: 0.99, language: 'en' }],
    },
    {
      type: 'word' as const,
      start_time: 0.5,
      end_time: 1.0,
      alternatives: [{ content: 'world', confidence: 0.88, language: 'en' }],
    },
    {
      type: 'punctuation' as const,
      start_time: 1.0,
      end_time: 1.0,
      alternatives: [{ content: '.', confidence: 1.0 }],
    },
    {
      type: 'word' as const,
      start_time: 2.0,
      end_time: 2.5,
      alternatives: [{ content: 'bonjour', confidence: 0.95, language: 'fr' }],
    },
  ],
  speaker_diarisation_results: [
    { speaker_name: 'S1', start_time: 0.0, end_time: 1.5 },
    { speaker_name: 'S2', start_time: 2.0, end_time: 3.0 },
  ],
}

describe('normalizeSpeechmatics', () => {
  it('filters out punctuation tokens', () => {
    const segments = normalizeSpeechmatics(mockResponse)
    const allWords = segments.flatMap((s) => s.words)
    expect(allWords.every((w) => w.text !== '.')).toBe(true)
  })

  it('assigns words to speaker segments by time overlap', () => {
    const segments = normalizeSpeechmatics(mockResponse)
    expect(segments).toHaveLength(2)
    expect(segments[0].words).toHaveLength(2)
    expect(segments[1].words).toHaveLength(1)
  })

  it('maps speaker labels to numeric IDs', () => {
    const segments = normalizeSpeechmatics(mockResponse)
    expect(segments[0].speaker_id).toBe(0)
    expect(segments[0].speaker).toBe('Speaker S1')
    expect(segments[1].speaker_id).toBe(1)
    expect(segments[1].speaker).toBe('Speaker S2')
  })

  it('maps word fields correctly', () => {
    const segments = normalizeSpeechmatics(mockResponse)
    const word = segments[0].words[0]
    expect(word.text).toBe('hello')
    expect(word.start_timestamp).toBe(0.0)
    expect(word.end_timestamp).toBe(0.5)
    expect(word.confidence).toBe(0.99)
    expect(word.language).toBe('en')
  })

  it('sets segment language from first word', () => {
    const segments = normalizeSpeechmatics(mockResponse)
    expect(segments[0].language).toBe('en')
    expect(segments[1].language).toBe('fr')
  })

  it('returns single segment with all words when no diarization', () => {
    const noDiarization = { results: [...mockResponse.results], speaker_diarisation_results: [] }
    const segments = normalizeSpeechmatics(noDiarization)
    expect(segments).toHaveLength(1)
    expect(segments[0].speaker_id).toBe(0)
  })
})
