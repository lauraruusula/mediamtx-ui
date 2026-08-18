import { describe, it, expect } from 'vitest'
import {
  segmentDurationSeconds,
  recordingTotalDurationSeconds,
  buildPlaybackUrl,
  buildFullRecordingUrl
} from '@/composables/useRecordingPlayback'
import type { APIRecordingSegment } from '@/types/api'

const segments: APIRecordingSegment[] = [
  { start: '2026-08-01T10:00:00Z', duration: 5.5 },
  { start: '2026-08-01T10:00:05Z', duration: 5.5 },
  { start: '2026-08-01T10:00:10Z', duration: 5.5 }
]

describe('segmentDurationSeconds', () => {
  it('prefers the segment-reported duration', () => {
    expect(segmentDurationSeconds(segments, 0)).toBe(5.5)
  })

  it('derives duration from the gap to the next segment when missing', () => {
    const gapSegments = [{ start: '2026-08-01T10:00:00Z' }, { start: '2026-08-01T10:00:10Z' }]
    expect(segmentDurationSeconds(gapSegments, 0)).toBe(10)
  })

  it('falls back to a generous bound for the last segment without a duration', () => {
    const last = [{ start: '2026-08-01T10:00:00Z' }]
    expect(segmentDurationSeconds(last, 0)).toBe(3600)
  })

  it('returns 0 for an out-of-range index', () => {
    expect(segmentDurationSeconds(segments, 99)).toBe(0)
  })
})

describe('recordingTotalDurationSeconds', () => {
  it('sums all segment durations', () => {
    expect(recordingTotalDurationSeconds(segments)).toBeCloseTo(16.5)
  })

  it('returns 0 for empty recordings', () => {
    expect(recordingTotalDurationSeconds([])).toBe(0)
  })
})

describe('buildPlaybackUrl', () => {
  it('builds a plain-HTTP URL with path, start and duration params', () => {
    const url = buildPlaybackUrl('cam/1', segments, 0, 9996)
    expect(url).toBe(
      `http://${window.location.hostname}:9996/get?path=cam%2F1&start=2026-08-01T10%3A00%3A00Z&duration=5.500`
    )
  })

  it('returns an empty string for an invalid index', () => {
    expect(buildPlaybackUrl('cam', segments, 99, 9996)).toBe('')
  })
})

describe('buildFullRecordingUrl', () => {
  it('uses the first segment start and the total duration', () => {
    const url = buildFullRecordingUrl('cam', segments, 9996)
    expect(url).toContain('path=cam')
    expect(url).toContain('start=2026-08-01T10%3A00%3A00Z')
    expect(url).toContain('duration=16.500')
  })

  it('returns an empty string when there are no segments', () => {
    expect(buildFullRecordingUrl('cam', [], 9996)).toBe('')
  })
})
