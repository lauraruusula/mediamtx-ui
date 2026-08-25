import api from '@/api'
import type { APIPath, APIListResponse } from '@/types/api'

// Get server info (version, start time)
export const getInfo = () => api.get('/v3/info')

// Get all paths (pagination optional)
export const getPaths = (page = 0, itemsPerPage = 100) =>
  api.get('/v3/paths/list', { params: { page, itemsPerPage } })

// Get a single path
export const getPath = (name: string) => api.get(`/v3/paths/get/${encodeURIComponent(name)}`)

/**
 * Fetches every path across all pages. The dashboard aggregates, search-full-
 * fetches and the global alert poller all need the complete list; a single
 * itemsPerPage=1000 call silently truncates past 1,000 paths.
 */
export const getAllPaths = async (): Promise<APIPath[]> => {
  const first = (await getPaths(0, 1000)) as unknown as APIListResponse<APIPath>
  const items = [...(first.items || [])]
  for (let page = 1; page < (first.pageCount ?? 1); page++) {
    const res = (await getPaths(page, 1000)) as unknown as APIListResponse<APIPath>
    items.push(...(res.items || []))
  }
  return items
}
