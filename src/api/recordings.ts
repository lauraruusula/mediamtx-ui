import api from '@/api'
import type { APIRecording, APIListResponse } from '@/types/api'

export const listRecordings = (page = 0, itemsPerPage = 100) =>
  api.get('/v3/recordings/list', { params: { page, itemsPerPage } })

export const getRecording = (name: string) =>
  api.get(`/v3/recordings/get/${encodeURIComponent(name)}`)

export const deleteRecordingSegment = (path: string, start: string) =>
  api.delete('/v3/recordings/deletesegment', { params: { path, start } })

/** Fetches every recording across all pages (search-full-fetch path). */
export const getAllRecordings = async (): Promise<APIRecording[]> => {
  const first = (await listRecordings(0, 1000)) as unknown as APIListResponse<APIRecording>
  const items = [...(first.items || [])]
  for (let page = 1; page < (first.pageCount ?? 1); page++) {
    const res = (await listRecordings(page, 1000)) as unknown as APIListResponse<APIRecording>
    items.push(...(res.items || []))
  }
  return items
}
