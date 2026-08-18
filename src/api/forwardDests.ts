import api from '@/api'

// Live forwarding state for a path's configured destinations
export const listForwardDests = (path: string, page = 0, itemsPerPage = 100) =>
  api.get('/v3/paths/forward/list', { params: { path, page, itemsPerPage } })

export const getForwardDest = (path: string, id: string) =>
  api.get('/v3/paths/forward/get', { params: { path, id } })
