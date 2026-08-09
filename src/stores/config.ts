import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getGlobalConfig, updateGlobalConfig } from '@/api/globalConfig'

export const useConfigStore = defineStore('config', () => {
  const config = ref<Record<string, any>>({})
  const loading = ref(false)
  let loaded = false
  let loadPromise: Promise<Record<string, any>> | null = null

  const fetchConfig = async () => {
    loading.value = true
    try {
      const res = await getGlobalConfig()
      config.value = res as any
      return config.value
    } finally {
      loading.value = false
    }
  }

  // Fetches the live config once, then serves the cached copy. Used by the
  // stream-URL builders so copy/paste links reflect the server's real ports.
  const ensureLoaded = (): Promise<Record<string, any>> => {
    if (loaded) return Promise.resolve(config.value)
    if (!loadPromise) {
      loadPromise = fetchConfig()
        .then(cfg => {
          loaded = true
          return cfg
        })
        .finally(() => {
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

  return { config, loading, fetchConfig, ensureLoaded, saveConfig }
})
