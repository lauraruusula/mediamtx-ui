import { ref, onUnmounted } from 'vue'

export const AUTO_REFRESH_INTERVAL_MS = 5000

/**
 * Interval poller for list views. When `storageKey` is provided the active
 * state is persisted to localStorage (and `defaultActive` seeds the initial
 * state when nothing is stored yet).
 */
export function useAutoRefresh(
  callback: () => Promise<void>,
  intervalMs = AUTO_REFRESH_INTERVAL_MS,
  storageKey?: string,
  defaultActive = false
) {
  const active = ref(defaultActive)

  if (storageKey) {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'true') active.value = true
    else if (saved === 'false') active.value = false
  }

  let timer: ReturnType<typeof setInterval> | null = null
  let inFlight = false

  const persist = () => {
    if (storageKey) localStorage.setItem(storageKey, String(active.value))
  }

  const start = () => {
    if (timer) return
    active.value = true
    persist()
    timer = setInterval(async () => {
      // Background tabs get their timers throttled anyway, and nothing on
      // screen needs refreshing while hidden — skip the request entirely.
      if (document.hidden) return
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
    persist()
  }

  // el-switch binds to `active` via v-model and fires @change afterwards —
  // `update:modelValue` is emitted first, so by the time `toggle()` runs the
  // ref already holds the *new* value. Match the timer to it rather than
  // inverting the old state (which would always snap the switch back).
  const toggle = () => {
    if (active.value) start()
    else stop()
  }

  // Unmount only stops polling — it must not flip (or persist) the toggle state.
  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return { active, start, stop, toggle }
}
