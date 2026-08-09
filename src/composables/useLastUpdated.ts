import { ref, computed, onUnmounted } from 'vue'
import { formatRelativeTime } from './useFormatters'

/**
 * Tracks when a list was last successfully refreshed so views can show an
 * "Updated Xs ago" hint. The clock ticks every 15s to keep the label fresh
 * without a per-second interval on every list page.
 */
export function useLastUpdated() {
  const lastUpdated = ref<number | null>(null)
  const now = ref(Date.now())

  const timer = setInterval(() => {
    now.value = Date.now()
  }, 15000)

  const markUpdated = () => {
    lastUpdated.value = Date.now()
    now.value = Date.now()
  }

  const label = computed(() =>
    lastUpdated.value ? `Updated ${formatRelativeTime(lastUpdated.value)}` : ''
  )

  onUnmounted(() => clearInterval(timer))

  return { markUpdated, label }
}
