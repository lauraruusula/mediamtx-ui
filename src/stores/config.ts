import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getGlobalConfig, updateGlobalConfig } from '@/api/globalConfig'

// Protocols exposed as config flags (`rtsp`, `rtmp`, `hls`, `webrtc`, `srt`).
// MediaMTX registers each protocol's API routes only when its server is
// enabled, so a disabled protocol would otherwise surface as a raw 404 on its
// connection/session page.
export type ProtocolKey = 'rtsp' | 'rtmp' | 'hls' | 'webrtc' | 'srt'

export const useConfigStore = defineStore('config', () => {
  const config = ref<Record<string, any>>({})
  const loading = ref(false)
  const loaded = ref(false)
  let loadPromise: Promise<Record<string, any>> | null = null

  const fetchConfig = async () => {
    loading.value = true
    try {
      const res = await getGlobalConfig()
      config.value = res as any
      loaded.value = true
      return config.value
    } finally {
      loading.value = false
    }
  }

  // Fetches the live config once, then serves the cached copy. Used by the
  // stream-URL builders so copy/paste links reflect the server's real ports.
  const ensureLoaded = (): Promise<Record<string, any>> => {
    if (loaded.value) return Promise.resolve(config.value)
    if (!loadPromise) {
      loadPromise = fetchConfig().finally(() => {
        loadPromise = null
      })
    }
    return loadPromise
  }

  const saveConfig = async (data: Record<string, any>) => {
    loading.value = true
    try {
      await updateGlobalConfig(data)
      await fetchConfig()
    } finally {
      loading.value = false
    }
  }

  // True unless the config explicitly says the protocol's server is off.
  // MediaMTX omits default-valued flags, so a missing flag means "enabled".
  // Before the config has loaded we assume enabled so pages never flash hidden.
  const protocolEnabled = (key: ProtocolKey): boolean => {
    if (!loaded.value) return true
    return config.value[key] !== false
  }

  const protocols = computed<Record<ProtocolKey, boolean>>(() => ({
    rtsp: protocolEnabled('rtsp'),
    rtmp: protocolEnabled('rtmp'),
    hls: protocolEnabled('hls'),
    webrtc: protocolEnabled('webrtc'),
    srt: protocolEnabled('srt')
  }))

  return {
    config,
    loading,
    loaded,
    protocols,
    fetchConfig,
    ensureLoaded,
    saveConfig,
    protocolEnabled
  }
})
