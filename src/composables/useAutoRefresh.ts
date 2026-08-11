import { ref, onMounted, onUnmounted } from 'vue'

export const AUTO_REFRESH_INTERVAL_MS = 5000

export const AUTO_REFRESH_INTERVAL_OPTIONS_MS = [5000, 15000, 30000]

/**
 * Interval poller for list views. When `storageKey` is provided the active
 * state is persisted to localStorage (and `defaultActive` seeds the initial
 * state when nothing is stored yet). The poll interval can be changed at
 * runtime via `setIntervalMs` (persisted alongside the active state) so views
 * can offer a 5s/15s/30s selector instead of hard-coding one cadence.
 */
export function useAutoRefresh(
  callback: () => Promise<void>,
  intervalMs = AUTO_REFRESH_INTERVAL_MS,
  storageKey?: string,
  defaultActive = false
) {
  const active = ref(defaultActive)
  const interval = ref(intervalMs)

  if (storageKey) {
    const saved = localStorage.getItem(storageKey)
    if (saved === 'true') active.value = true
    else if (saved === 'false') active.value = false
    const savedInterval = Number(localStorage.getItem(`${storageKey}:interval`))
    if (Number.isFinite(savedInterval) && savedInterval > 0) {
      interval.value = savedInterval
    }
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
    }, interval.value)
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
    if (active.value) {
      start()
      // Toggling on should show fresh data right away instead of waiting up
      // to a full interval for the first tick.
      callback().catch(() => {})
    } else {
      stop()
    }
  }

  const setIntervalMs = (ms: number) => {
    interval.value = ms
    if (storageKey) localStorage.setItem(`${storageKey}:interval`, String(ms))
    // Restart the timer so the new cadence applies immediately (and doesn't
    // fire after the old interval on the next tick).
    if (timer) {
      clearInterval(timer)
      timer = null
      if (active.value) start()
    }
  }

  // Resume a persisted "on" state after a reload or route change — otherwise
  // the switch renders checked (state was restored from storage) but no timer
  // is running, so the view silently stops polling until the user toggles.
  onMounted(() => {
    if (active.value) start()
  })

  // Unmount only stops polling — it must not flip (or persist) the toggle state.
  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return { active, interval, start, stop, toggle, setIntervalMs }
}
