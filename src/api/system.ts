import api from '@/api'

// Get server info (version, start time)
export const getInfo = () => api.get('/v3/info')

// Get all paths (pagination optional)
export const getPaths = (page = 0, itemsPerPage = 100) =>
  api.get('/v3/paths/list', { params: { page, itemsPerPage } })

// Get a single path
export const getPath = (name: string) =>
  api.get(`/v3/paths/get/${encodeURIComponent(name)}`)
