import { ref, watch, onUnmounted } from 'vue'

/**
 * Animates a displayed integer from its previous value to a new one whenever
 * `source` changes (ease-out, ~500ms). Purely cosmetic — a small "the numbers
 * are alive" touch for dashboard stat tiles. The display starts at 0, so the
 * first value counts up on mount too.
 */
export function useCountUp(source: () => number, duration = 500) {
  const display = ref(0)
  let raf: number | null = null

  watch(
    source,
    (target, previous) => {
      const from = previous ?? 0
      const to = target
      if (raf) cancelAnimationFrame(raf)
      if (from === to) {
        display.value = to
        return
      }
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - t, 3)
        display.value = Math.round(from + (to - from) * eased)
        if (t < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    },
    { immediate: true }
  )

  // Without this, a component that unmounts mid-animation (e.g. navigating
  // away right after a refresh) leaves a dangling rAF loop writing to a ref
  // no one reads anymore.
  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf)
  })

  return display
}
