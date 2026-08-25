import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  listRecordings,
  getAllRecordings,
  getRecording,
  deleteRecordingSegment
} from '@/api/recordings'
import type { APIRecording, APIListResponse } from '@/types/api'

export const useRecordingsStore = defineStore('recordings', () => {
  const list = ref<APIRecording[]>([])
  const itemCount = ref(0)
  const loading = ref(false)

  const fetchList = async (page = 0, itemsPerPage = 100) => {
    loading.value = true
    try {
      const res = (await listRecordings(
        page,
        itemsPerPage
      )) as unknown as APIListResponse<APIRecording>
      list.value = res.items || []
      itemCount.value = res.itemCount || 0
    } finally {
      loading.value = false
    }
  }

  // Full-list fetch for the search path, which filters client-side and so
  // needs every recording — not just the current page (and not a 1,000-item
  // cap). Records the last full fetch so typing doesn't refetch each keystroke.
  const fetchAll = async () => {
    loading.value = true
    try {
      list.value = await getAllRecordings()
      itemCount.value = list.value.length
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (name: string) => {
    const res = await getRecording(name)
    return res as unknown as APIRecording
  }

  const deleteSegment = async (path: string, start: string) => {
    await deleteRecordingSegment(path, start)
  }

  return { list, itemCount, loading, fetchList, fetchAll, fetchOne, deleteSegment }
})
