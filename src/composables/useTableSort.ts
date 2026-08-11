import { ref, reactive } from 'vue'

export interface TableSortState {
  prop: string
  order: 'ascending' | 'descending'
}

/**
 * Persists an el-table's active sort (column prop + direction) to localStorage
 * so the sort survives reloads. Wire it up with `:default-sort="sort.defaultSort"`
 * and `@sort-change="sort.onSortChange"`. When no sort is stored (or the user
 * clears it) `defaultSort` is an inert `{ prop: '' }` that matches nothing.
 * Returns a reactive object so templates see the unwrapped sort state.
 */
export function useTableSort(storageKey: string) {
  const load = (): TableSortState | undefined => {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return undefined
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.prop && ['ascending', 'descending'].includes(parsed.order)) {
        return { prop: parsed.prop, order: parsed.order }
      }
    } catch {
      /* corrupted value — ignore */
    }
    return undefined
  }

  const defaultSort = ref<TableSortState>(load() ?? { prop: '', order: 'ascending' })

  const onSortChange = (data: {
    prop: string | null
    order: 'ascending' | 'descending' | null
  }) => {
    if (data.prop && data.order) {
      defaultSort.value = { prop: data.prop, order: data.order }
      localStorage.setItem(storageKey, JSON.stringify(defaultSort.value))
    } else if (!data.prop && !data.order) {
      // The user explicitly cleared the sort (third click on the header) —
      // drop the stored sort. Columns without a `prop` (custom sort-method)
      // only emit an order without a prop, so they sort in-session but must
      // not wipe (or overwrite) the persisted sort.
      defaultSort.value = { prop: '', order: 'ascending' }
      localStorage.removeItem(storageKey)
    }
  }

  return reactive({ defaultSort, onSortChange })
}
