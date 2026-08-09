import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getRTMPConnections, getRTMPConnection, kickRTMPConnection } from '@/api/rtmpConn'
import type { APIRTMPConn, APIListResponse } from '@/types/api'

export const useRtmpConnStore = defineStore('rtmpConn', () => {
  const list = ref<APIRTMPConn[]>([])
  const itemCount = ref(0)
  const loading = ref(false)

  const fetchList = async (page = 0, itemsPerPage = 100) => {
    loading.value = true
    try {
      const res = (await getRTMPConnections(
        page,
        itemsPerPage
      )) as unknown as APIListResponse<APIRTMPConn>
      list.value = res.items || []
      itemCount.value = res.itemCount || 0
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (id: string) => {
    const res = await getRTMPConnection(id)
    return res as unknown as APIRTMPConn
  }

  const kick = async (id: string) => {
    await kickRTMPConnection(id)
    list.value = list.value.filter(c => c.id !== id)
    itemCount.value = Math.max(0, itemCount.value - 1)
  }

  return { list, itemCount, loading, fetchList, fetchOne, kick }
})
