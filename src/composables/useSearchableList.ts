import { watch, onUnmounted, type Ref } from 'vue'

/**
 * Debounced reload hook for searchable list views: when the search term
 * changes (and settles for `debounceMs`), the view's `loadData` is called.
 * The view decides what that means — typically fetch the full list while
 * searching so client-side filtering covers every page, and fall back to the
 * paginated fetch once the search is cleared.
 */
export function useSearchableList(
  search: Ref<string>,
  onSearchChange: () => void,
  debounceMs = 300
) {
  let timer: ReturnType<typeof setTimeout> | null = null

  const stop = watch(search, () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onSearchChange, debounceMs)
  })

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
    stop()
  })
}

/** Case-insensitive substring filter across any list field(s). */
export function filterList<T>(items: T[], term: string, fields: (item: T) => string): T[] {
  const s = term.trim().toLowerCase()
  if (!s) return items
  return items.filter(item => fields(item).toLowerCase().includes(s))
}
