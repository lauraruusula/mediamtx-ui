// Optional host override for stream/playback URLs, set by a multi-server
// profile. When the admin UI is served from a reverse proxy (or one of several
// managed servers), copied stream links must point at the streaming host
// rather than the UI's own hostname. Empty override falls back to the UI host.
let override = ''

export function setStreamHostOverride(host: string): void {
  // Tolerate a scheme or a trailing slash that users paste in by accident.
  override = (host || '')
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/\/+$/, '')
}

export function streamHost(): string {
  return override || window.location.hostname
}
