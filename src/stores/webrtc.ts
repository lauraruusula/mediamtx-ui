import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getWebRTCSessions, getWebRTCSession, kickWebRTCSession } from '@/api/webrtc'
import type { APIWebRTCSession, APIListResponse } from '@/types/api'

export const useWebRTCStore = defineStore('webrtc', () => {
  const list = ref<APIWebRTCSession[]>([])
  const itemCount = ref(0)
  const loading = ref(false)

  const fetchList = async (page = 0, itemsPerPage = 100) => {
    loading.value = true
    try {
      const res = (await getWebRTCSessions(
        page,
        itemsPerPage
      )) as unknown as APIListResponse<APIWebRTCSession>
      list.value = res.items || []
      itemCount.value = res.itemCount || 0
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (id: string) => {
    const res = await getWebRTCSession(id)
    return res as unknown as APIWebRTCSession
  }

  const kick = async (id: string) => {
    await kickWebRTCSession(id)
    list.value = list.value.filter(s => s.id !== id)
    itemCount.value = Math.max(0, itemCount.value - 1)
  }

  return { list, itemCount, loading, fetchList, fetchOne, kick }
})
