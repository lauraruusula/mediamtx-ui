import { ref, onUnmounted } from 'vue'

export const AUTO_REFRESH_INTERVAL_MS = 5000

export function useAutoRefresh(
  callback: () => Promise<void>,
  intervalMs = AUTO_REFRESH_INTERVAL_MS
) {
  const active = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null
  let inFlight = false

  const start = () => {
    if (timer) return
    active.value = true
    timer = setInterval(async () => {
      // Skip a tick when the previous call hasn't finished yet (slow API on a
      // 5s interval) so requests never stack up and loading state stays clean.
      if (inFlight) return
      inFlight = true
      try {
        await callback()
      } catch {
        // Silently swallow auto-refresh errors
      } finally {
        inFlight = false
      }
    }, intervalMs)
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    active.value = false
  }

  const toggle = () => {
    active.value ? stop() : start()
  }

  onUnmounted(stop)

  return { active, start, stop, toggle }
}
