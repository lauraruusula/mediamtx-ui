/**
 * Display-only redaction for credentials that MediaMTX's API does NOT redact
 * itself (it only masks `*Pass` fields). Path `source` URLs and forward `dest`
 * URLs routinely embed `user:password@`, and a WHIP bearer token is returned
 * in full — all of which would otherwise be visible at a glance in tables,
 * drawers and CSV exports. The raw values are still sent to the edit forms,
 * exactly like the `<redacted>` password flow.
 */

const URL_CREDENTIALS_RE = /^(\w+:\/\/)([^/@\s]+)@/

/**
 * Masks the password in a `scheme://user:password@host/...` URL, keeping the
 * username so the link stays recognizable. URLs without a password are left
 * untouched. Deliberately regex-based (not URL parsing) because these are
 * stream URLs like `rtsp://user:pass@host/...` that `new URL()` handles
 * inconsistently, and this is display-only.
 */
export function redactUrlCredentials(url: string | null | undefined): string {
  if (!url) return url ?? ''
  return url.replace(URL_CREDENTIALS_RE, (_match, scheme: string, credentials: string) => {
    const sep = credentials.indexOf(':')
    if (sep === -1) return `${scheme}${credentials}@`
    return `${scheme}${credentials.slice(0, sep)}:***@`
  })
}

/**
 * Masks a secret for display, returning a fixed placeholder when it's set and
 * an empty string when it isn't. Use wherever a raw token would otherwise be
 * rendered (list views, detail rows) while keeping the raw value for editing.
 */
export function maskSecret(value: string | null | undefined): string {
  return value ? '••••••••' : ''
}
