import { ref } from 'vue'
import { getErrorMessage } from './useErrorMessage'

/**
 * Tracks a human-readable load error for a list view so an "empty" table is
 * never confused with an unreachable API. Wrap the fetch with `run()` and
 * render the error through <ApiErrorBanner>.
 */
export function useListError() {
  const error = ref('')

  const run = async <T>(fn: () => Promise<T>, fallback: string): Promise<T | undefined> => {
    try {
      const res = await fn()
      error.value = ''
      return res
    } catch (e) {
      error.value = getErrorMessage(e, fallback)
      return undefined
    }
  }

  return { error, run }
}
