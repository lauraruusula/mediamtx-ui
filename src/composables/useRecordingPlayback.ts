import type { APIRecordingSegment } from '@/types/api'

// MediaMTX's playback server (enabled via `playback: yes` in mediamtx.yml)
// defaults to port 9996 and serves recorded segments at GET /get?path=&start=&duration=.
const DEFAULT_PLAYBACK_PORT = 9996

/**
 * Builds the playback-server URL for one recorded segment. `duration` isn't
 * provided by the /v3/recordings list API, so it's derived from the gap to
 * the next segment's start time when there is one. For the most recent
 * segment (no "next"), we fall back to a generous upper bound — the
 * playback server serves only what actually exists on disk, so an
 * over-estimate is safe, just not exact.
 */
export function buildPlaybackUrl(
  pathName: string,
  segments: APIRecordingSegment[],
  index: number,
  fallbackDurationSeconds = 3600
): string {
  const segment = segments[index]
  const next = segments[index + 1]
  const startMs = new Date(segment.start).getTime()

  const durationSeconds = next
    ? Math.max((new Date(next.start).getTime() - startMs) / 1000, 1)
    : fallbackDurationSeconds

  const params = new URLSearchParams({
    path: pathName,
    start: segment.start,
    duration: durationSeconds.toFixed(3)
  })

  // MediaMTX's playback server is plain HTTP (no TLS support), so the scheme
  // must not be inherited from the admin UI's own protocol — an HTTPS-served UI
  // would otherwise generate https:// links to an http-only server.
  return `http://${window.location.hostname}:${DEFAULT_PLAYBACK_PORT}/get?${params.toString()}`
}
