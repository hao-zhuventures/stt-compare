import { describe, it, expect } from 'vitest'
import { normalizeOpenAI } from './openai'

const mockResponse = {
  segments: [
    {
      id: 0,
      text: 'hello world',
      start: 0.0,
      end: 1.0,
      words: [
        { word: ' hello', start: 0.0, end: 0.5, probability: 0.99 },
        { word: ' world', start: 0.5, end: 1.0, probability: 0.87 },
      ],
    },
    {
      id: 1,
      text: 'goodbye',
      start: 1.0,
      end: 1.5,
      words: [{ word: ' goodbye', start: 1.0, end: 1.5, probability: 0.95 }],
    },
  ],
}

describe('normalizeOpenAI', () => {
  it('creates one segment per Whisper segment', () => {
    const segments = normalizeOpenAI(mockResponse)
    expect(segments).toHaveLength(2)
  })

  it('all segments have speaker_id 0 (Whisper has no diarization)', () => {
    const segments = normalizeOpenAI(mockResponse)
    expect(segments[0].speaker_id).toBe(0)
    expect(segments[1].speaker_id).toBe(0)
    expect(segments[0].speaker).toBe('Speaker 0')
  })

  it('uses probability as confidence', () => {
    const segments = normalizeOpenAI(mockResponse)
    expect(segments[0].words[0].confidence).toBe(0.99)
  })

  it('strips leading space from word text', () => {
    const segments = normalizeOpenAI(mockResponse)
    expect(segments[0].words[0].text).toBe('hello')
    expect(segments[0].words[1].text).toBe('world')
  })

  it('sets language to null (Whisper words have no per-word language)', () => {
    const segments = normalizeOpenAI(mockResponse)
    expect(segments[0].words[0].language).toBeNull()
  })

  it('returns empty array for empty segments', () => {
    expect(normalizeOpenAI({ segments: [] })).toEqual([])
  })
})
