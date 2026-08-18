import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getInfo, getPaths } from '@/api/system'
import { getRTSPConnections } from '@/api/rtspConn'
import { getRTSPSessions } from '@/api/rtspSession'
import { getRTMPConnections } from '@/api/rtmpConn'
import { getWebRTCSessions } from '@/api/webrtc'
import { listHlsMuxers } from '@/api/hlsMuxer'
import { getSRTConnections } from '@/api/srtConn'
import type { APIInfo, APIPath, APIListResponse } from '@/types/api'

interface ProtocolCounts {
  rtspConns: number
  rtspSessions: number
  rtmpConns: number
  webrtcSessions: number
  hlsMuxers: number
  srtConns: number
}

export const useSystemStore = defineStore('system', () => {
  const info = ref<APIInfo | null>(null)
  const paths = ref<APIPath[]>([])
  const pathCount = ref(0)
  const protocolCounts = ref<ProtocolCounts>({
    rtspConns: 0,
    rtspSessions: 0,
    rtmpConns: 0,
    webrtcSessions: 0,
    hlsMuxers: 0,
    srtConns: 0
  })
  const loading = ref(false)
  const connected = ref(false)

  const onlinePaths = computed(() => paths.value.filter(p => p.online))
  // Paths whose source is reporting frame errors — a leading indicator that
  // something is degrading even while the stream stays up.
  const pathsWithErrors = computed(
    () => paths.value.filter(p => p.online && (p.inboundFramesInError || 0) > 0).length
  )
  const totalReaders = computed(() =>
    paths.value.reduce((sum, p) => sum + (p.readers?.length || 0), 0)
  )
  // Aggregate bandwidth across all paths, for a dashboard-level bandwidth stat.
  const totalInboundBytes = computed(() =>
    paths.value.reduce((sum, p) => sum + (p.inboundBytes || 0), 0)
  )
  const totalOutboundBytes = computed(() =>
    paths.value.reduce((sum, p) => sum + (p.outboundBytes || 0), 0)
  )

  // Compute source type distribution (from path.source.type)
  const sourceTypeDistribution = computed(() => {
    const dist: Record<string, number> = {}
    for (const p of paths.value) {
      if (p.source) {
        const t = p.source.type
        dist[t] = (dist[t] || 0) + 1
      }
    }
    return dist
  })

  const fetchInfo = async () => {
    const res = await getInfo()
    info.value = res as unknown as APIInfo
    connected.value = true
  }

  const fetchPaths = async () => {
    const res = (await getPaths(0, 1000)) as unknown as APIListResponse<APIPath>
    paths.value = res.items || []
    pathCount.value = res.itemCount || 0
    // Any successful full-path fetch proves the API is reachable, so the
    // header status can be restored without an extra /info round-trip.
    connected.value = true
  }

  const fetchProtocolCounts = async () => {
    // itemsPerPage must be >= 1 — the API rejects 0 as invalid. itemCount
    // reflects the total regardless of page size, so 1 is enough here.
    const results = await Promise.allSettled([
      getRTSPConnections(0, 1),
      getRTSPSessions(0, 1),
      getRTMPConnections(0, 1),
      getWebRTCSessions(0, 1),
      listHlsMuxers(0, 1),
      getSRTConnections(0, 1)
    ])

    const getCount = (r: PromiseSettledResult<any>) =>
      r.status === 'fulfilled' ? r.value?.itemCount || 0 : 0

    protocolCounts.value = {
      rtspConns: getCount(results[0]),
      rtspSessions: getCount(results[1]),
      rtmpConns: getCount(results[2]),
      webrtcSessions: getCount(results[3]),
      hlsMuxers: getCount(results[4]),
      srtConns: getCount(results[5])
    }
  }

  const fetchAll = async () => {
    loading.value = true
    try {
      await Promise.all([fetchInfo(), fetchPaths(), fetchProtocolCounts()])
    } catch (error) {
      connected.value = false
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    info,
    paths,
    pathCount,
    protocolCounts,
    loading,
    connected,
    onlinePaths,
    pathsWithErrors,
    totalReaders,
    totalInboundBytes,
    totalOutboundBytes,
    sourceTypeDistribution,
    fetchInfo,
    fetchPaths,
    fetchProtocolCounts,
    fetchAll
  }
})
