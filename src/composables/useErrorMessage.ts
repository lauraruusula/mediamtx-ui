import axios from 'axios'

/**
 * Extracts a human-readable message from an API/axios error so toasts can show
 * what actually went wrong instead of a generic "Failed to X".
 *
 * MediaMTX returns JSON error bodies shaped like `{ "error": "..." }`, but we
 * defensively handle a few other common shapes too.
 */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as unknown

    if (typeof data === 'string' && data.trim()) return data

    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>
      const candidate = obj.error ?? obj.message ?? obj.detail
      if (typeof candidate === 'string' && candidate.trim()) return candidate
    }

    if (err.code === 'ECONNABORTED') return 'Request timed out. Please try again.'
    if (!err.response) return 'Could not reach the server. Check your connection.'
    if (err.message) return err.message
  }

  if (err instanceof Error && err.message) return err.message

  return fallback
}
