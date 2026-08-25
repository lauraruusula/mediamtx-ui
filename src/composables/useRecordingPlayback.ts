import type { APIRecordingSegment } from '@/types/api'
import { streamHost } from '@/composables/useStreamHost'

// MediaMTX's playback server (enabled via `playback: yes` in mediamtx.yml)
// defaults to port 9996 and serves recorded segments at GET /get?path=&start=&duration=.
const DEFAULT_PLAYBACK_PORT = 9996

/**
 * Best-effort duration for one segment. When the API provides a real
 * `duration` it's used directly; otherwise it's derived from the gap to the
 * next segment's start time when there is one. For the most recent segment
 * (no "next"), we fall back to a generous upper bound — the playback server
 * serves only what actually exists on disk, so an over-estimate is safe, just
 * not exact.
 */
export function segmentDurationSeconds(
  segments: APIRecordingSegment[],
  index: number,
  fallbackDurationSeconds = 3600
): number {
  const segment = segments[index]
  if (!segment) return 0
  const next = segments[index + 1]
  const startMs = new Date(segment.start).getTime()

  const derived = next
    ? Math.max((new Date(next.start).getTime() - startMs) / 1000, 1)
    : fallbackDurationSeconds
  return typeof segment.duration === 'number' && segment.duration > 0 ? segment.duration : derived
}

/** Sum of best-effort segment durations, used for recording-size totals. */
export function recordingTotalDurationSeconds(segments: APIRecordingSegment[]): number {
  return segments.reduce((sum, _, index) => sum + segmentDurationSeconds(segments, index), 0)
}

/** Playback URL covering the whole recording from its first segment. */
export function buildFullRecordingUrl(
  pathName: string,
  segments: APIRecordingSegment[],
  port = DEFAULT_PLAYBACK_PORT
): string {
  if (!segments.length) return ''
  const totalSeconds = recordingTotalDurationSeconds(segments)
  const params = new URLSearchParams({
    path: pathName,
    start: segments[0].start,
    duration: totalSeconds.toFixed(3)
  })
  return `http://${streamHost()}:${port}/get?${params.toString()}`
}

export function buildPlaybackUrl(
  pathName: string,
  segments: APIRecordingSegment[],
  index: number,
  port = DEFAULT_PLAYBACK_PORT,
  fallbackDurationSeconds = 3600
): string {
  const segment = segments[index]
  if (!segment) return ''
  const durationSeconds = segmentDurationSeconds(segments, index, fallbackDurationSeconds)

  const params = new URLSearchParams({
    path: pathName,
    start: segment.start,
    duration: durationSeconds.toFixed(3)
  })

  // MediaMTX's playback server is plain HTTP (no TLS support), so the scheme
  // must not be inherited from the admin UI's own protocol — an HTTPS-served UI
  // would otherwise generate https:// links to an http-only server.
  return `http://${streamHost()}:${port}/get?${params.toString()}`
}
