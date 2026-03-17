import { describe, it, expect } from 'vitest'
import { computeMetrics } from './metrics'
import type { Segment } from '@/types'

const makeSegment = (words: { confidence: number; language: string | null }[]): Segment => ({
  speaker: 'Speaker 0',
  speaker_id: 0,
  language: 'en',
  words: words.map((w, i) => ({
    text: 'word',
    start_timestamp: i,
    end_timestamp: i + 0.5,
    language: w.language,
    confidence: w.confidence,
  })),
})

describe('computeMetrics', () => {
  it('counts total words across all segments', () => {
    const segments = [
      makeSegment([{ confidence: 0.9, language: 'en' }]),
      makeSegment([{ confidence: 0.8, language: 'en' }, { confidence: 0.7, language: 'en' }]),
    ]
    const result = computeMetrics(segments, 1000)
    expect(result.wordCount).toBe(3)
  })

  it('computes average confidence', () => {
    const segments = [
      makeSegment([{ confidence: 0.9, language: 'en' }, { confidence: 0.7, language: 'en' }]),
    ]
    const result = computeMetrics(segments, 500)
    expect(result.avgConfidence).toBeCloseTo(0.8)
  })

  it('collects unique non-null languages', () => {
    const segments = [
      makeSegment([
        { confidence: 0.9, language: 'en' },
        { confidence: 0.8, language: 'fr' },
        { confidence: 0.7, language: 'en' },
        { confidence: 0.6, language: null },
      ]),
    ]
    const result = computeMetrics(segments, 500)
    expect(result.languagesDetected.sort()).toEqual(['en', 'fr'])
  })

  it('falls back to segment language when word language is null', () => {
    const segment: Segment = {
      speaker: 'Speaker 0',
      speaker_id: 0,
      language: 'de',
      words: [{ text: 'word', start_timestamp: 0, end_timestamp: 1, language: null, confidence: 0.9 }],
    }
    const result = computeMetrics([segment], 500)
    expect(result.languagesDetected).toContain('de')
  })

  it('stores processingTimeMs', () => {
    const result = computeMetrics([], 1234)
    expect(result.processingTimeMs).toBe(1234)
  })
})
