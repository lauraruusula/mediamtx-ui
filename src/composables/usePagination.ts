import { ref } from 'vue'

/**
 * Thin wrapper around a store's `fetchList(page, itemsPerPage)` action that
 * tracks 1-indexed page/pageSize state for an <el-pagination> control. When
 * `storageKey` is provided the chosen page size is persisted to localStorage.
 */
export function usePagination(
  fetchList: (page: number, itemsPerPage: number) => Promise<void>,
  defaultPageSize = 20,
  storageKey?: string
) {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)

  if (storageKey) {
    const saved = Number(localStorage.getItem(storageKey))
    if (Number.isFinite(saved) && saved >= 1) pageSize.value = saved
  }

  const load = () => fetchList(page.value - 1, pageSize.value)

  const handlePageChange = (p: number) => {
    page.value = p
    load()
  }

  const handleSizeChange = (size: number) => {
    pageSize.value = size
    if (storageKey) localStorage.setItem(storageKey, String(size))
    page.value = 1
    load()
  }

  return { page, pageSize, load, handlePageChange, handleSizeChange }
}
