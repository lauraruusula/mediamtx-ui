import api from '@/api'

// RTSP connections are read-only and cannot be closed (only Sessions support kick)

export const getRTSPConnections = (page = 0, itemsPerPage = 100) =>
  api.get('/v3/rtspconns/list', { params: { page, itemsPerPage } })

export const getRTSPConnection = (id: string) =>
  api.get(`/v3/rtspconns/get/${encodeURIComponent(id)}`)
