import type { Segment, Metrics } from '@/types'

export function computeMetrics(segments: Segment[], processingTimeMs: number): Metrics {
  const words = segments.flatMap((s) => s.words)
  const wordCount = words.length

  const avgConfidence =
    wordCount === 0
      ? 0
      : words.reduce((sum, w) => sum + w.confidence, 0) / wordCount

  const languageSet = new Set<string>()
  for (const segment of segments) {
    for (const word of segment.words) {
      const lang = word.language ?? segment.language
      if (lang) languageSet.add(lang)
    }
  }

  return {
    wordCount,
    avgConfidence,
    languagesDetected: Array.from(languageSet),
    processingTimeMs,
  }
}
