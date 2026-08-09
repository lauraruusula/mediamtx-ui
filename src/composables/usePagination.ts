import { ref } from 'vue'

/**
 * Thin wrapper around a store's `fetchList(page, itemsPerPage)` action that
 * tracks 1-indexed page/pageSize state for an <el-pagination> control.
 */
export function usePagination(
  fetchList: (page: number, itemsPerPage: number) => Promise<void>,
  defaultPageSize = 20
) {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)

  const load = () => fetchList(page.value - 1, pageSize.value)

  const handlePageChange = (p: number) => {
    page.value = p
    load()
  }

  const handleSizeChange = (size: number) => {
    pageSize.value = size
    page.value = 1
    load()
  }

  return { page, pageSize, load, handlePageChange, handleSizeChange }
}
