import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAllPaths, getPaths, getPath } from '@/api/system'
import type { APIPath, APIListResponse } from '@/types/api'

export const usePathsStore = defineStore('paths', () => {
  const list = ref<APIPath[]>([])
  const pageCount = ref(0)
  const itemCount = ref(0)
  const loading = ref(false)

  const fetchList = async (page = 0, itemsPerPage = 100) => {
    loading.value = true
    try {
      const res = (await getPaths(page, itemsPerPage)) as unknown as APIListResponse<APIPath>
      list.value = res.items || []
      pageCount.value = res.pageCount || 0
      itemCount.value = res.itemCount || 0
      sampleTraffic(list.value)
    } finally {
      loading.value = false
    }
  }

  // Full-list fetch for search/filter views, which filter client-side and so
  // need every path — not just the current page (and not a 1,000-item cap).
  const fetchAll = async () => {
    loading.value = true
    try {
      const items = await getAllPaths()
      list.value = items
      itemCount.value = items.length
      sampleTraffic(items)
    } finally {
      loading.value = false
    }
  }

  const fetchOne = async (name: string) => {
    const res = await getPath(name)
    return res as unknown as APIPath
  }

  return {
    list,
    pageCount,
    itemCount,
    loading,
    fetchList,
    fetchAll,
    fetchOne,
    trafficHistory,
    trafficFor
  }
})

// ---------------------------------------------------------------------------
// Per-path traffic history — sampled from every list fetch (auto-refresh feeds
// it without extra requests) and persisted so the sparklines survive reloads.
// ---------------------------------------------------------------------------
const MAX_TRAFFIC_SAMPLES = 60
const MAX_TRACKED_PATHS = 1000
const TRAFFIC_STORAGE_KEY = 'paths:traffic-history'

function loadTrafficHistory(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(TRAFFIC_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const out: Record<string, number[]> = {}
    if (parsed && typeof parsed === 'object') {
      for (const [name, arr] of Object.entries(parsed as Record<string, unknown>)) {
        if (!Array.isArray(arr)) continue
        const nums = arr.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
        if (nums.length) out[name] = nums.slice(-MAX_TRAFFIC_SAMPLES)
      }
    }
    return out
  } catch {
    return {}
  }
}

const trafficHistory = ref<Record<string, number[]>>(loadTrafficHistory())
const lastTrafficSampleAt: Record<string, number> = {}

function persistTrafficHistory() {
  try {
    localStorage.setItem(TRAFFIC_STORAGE_KEY, JSON.stringify(trafficHistory.value))
  } catch {
    // storage full or unavailable — history just won't survive a reload
  }
}

const trafficFor = (name: string) => trafficHistory.value[name] || []

// Record each path's cumulative traffic for the sparkline. Consecutive
// identical totals are skipped — auto-refresh polls are cheap, but flat
// duplicates only pad the array with no signal.
const sampleTraffic = (paths: { name: string; inboundBytes?: number; outboundBytes?: number }[]) => {
  const now = Date.now()
  for (const p of paths) {
    const total = (p.inboundBytes || 0) + (p.outboundBytes || 0)
    const arr = trafficHistory.value[p.name] || []
    if (arr[arr.length - 1] === total) continue
    arr.push(total)
    if (arr.length > MAX_TRAFFIC_SAMPLES) arr.shift()
    trafficHistory.value[p.name] = arr
    lastTrafficSampleAt[p.name] = now
  }
  // Bound localStorage on huge path lists by evicting the least-recently
  // sampled path once the tracking set grows too large.
  const keys = Object.keys(trafficHistory.value)
  if (keys.length > MAX_TRACKED_PATHS) {
    const drop = keys.sort(
      (a, b) => (lastTrafficSampleAt[a] || 0) - (lastTrafficSampleAt[b] || 0)
    )[0]
    if (drop) delete trafficHistory.value[drop]
  }
  persistTrafficHistory()
}
