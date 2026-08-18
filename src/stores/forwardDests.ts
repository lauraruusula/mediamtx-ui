import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as api from '@/api/forwardDests'
import type { APIForwardDest } from '@/types/api'

// Live forwarding state per path. Only the last-requested path's list is kept
// — the drawer that opens this store is per-path and single-instance.
export const useForwardDestsStore = defineStore('forwardDests', () => {
  const list = ref<APIForwardDest[]>([])
  const pathName = ref('')
  const loading = ref(false)

  const fetchList = async (path: string) => {
    loading.value = true
    pathName.value = path
    try {
      const res = (await api.listForwardDests(path, 0, 1000)) as any
      list.value = res.items || []
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (path: string, id: string) => {
    const res = (await api.getForwardDest(path, id)) as any
    return res as unknown as APIForwardDest
  }

  return { list, pathName, loading, fetchList, fetchOne }
})
