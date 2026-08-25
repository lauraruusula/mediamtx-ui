import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setApiBaseUrl } from '@/api'
import { setStreamHostOverride } from '@/composables/useStreamHost'

// Multi-server profiles let one admin UI drive several MediaMTX instances.
// Each profile optionally overrides the API endpoint (for a remote server or a
// different reverse-proxy prefix) and the host used when building stream and
// playback URLs (for when streams leave from a different host than the UI).
export interface ServerProfile {
  id: string
  name: string
  apiBaseUrl: string
  streamHost: string
}

const STORAGE_KEY = 'mediamtx-ui:servers'
const ACTIVE_KEY = 'mediamtx-ui:active-server'

const localProfile = (): ServerProfile => ({
  id: 'local',
  name: 'This server',
  apiBaseUrl: '',
  streamHost: ''
})

function loadProfiles(): ServerProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [localProfile()]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [localProfile()]
    const profiles = parsed.filter(
      (p): p is ServerProfile => !!p && typeof p.id === 'string' && typeof p.name === 'string'
    )
    return profiles.length ? profiles : [localProfile()]
  } catch {
    return [localProfile()]
  }
}

export const useServersStore = defineStore('servers', () => {
  const profiles = ref<ServerProfile[]>(loadProfiles())
  let storedActive: string | null = null
  try {
    storedActive = localStorage.getItem(ACTIVE_KEY)
  } catch {
    // non-persistent context — fall back to the first profile
  }
  const activeId = ref<string>(
    profiles.value.some(p => p.id === storedActive)
      ? (storedActive as string)
      : profiles.value[0].id
  )

  const activeProfile = computed(
    () => profiles.value.find(p => p.id === activeId.value) || profiles.value[0]
  )

  const applyProfile = (profile: ServerProfile) => {
    setApiBaseUrl(profile.apiBaseUrl)
    setStreamHostOverride(profile.streamHost)
  }

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles.value))
    } catch {
      // non-persistent context — profiles just won't survive a reload
    }
  }

  const addProfile = (name: string, apiBaseUrl: string, streamHost: string) => {
    const profile: ServerProfile = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()),
      name: name.trim(),
      apiBaseUrl: apiBaseUrl.trim(),
      streamHost: streamHost.trim()
    }
    profiles.value.push(profile)
    persist()
    return profile
  }

  const updateProfile = (id: string, patch: Partial<ServerProfile>) => {
    const index = profiles.value.findIndex(p => p.id === id)
    if (index === -1) return
    profiles.value[index] = { ...profiles.value[index], ...patch }
    persist()
    if (id === activeId.value) applyProfile(profiles.value[index])
  }

  const deleteProfile = (id: string) => {
    const index = profiles.value.findIndex(p => p.id === id)
    if (index === -1) return
    profiles.value.splice(index, 1)
    if (!profiles.value.length) profiles.value.push(localProfile())
    persist()
    if (activeId.value === id) {
      activeId.value = profiles.value[0].id
      try {
        localStorage.setItem(ACTIVE_KEY, activeId.value)
      } catch {
        // non-persistent context
      }
      applyProfile(profiles.value[0])
    }
  }

  const setActive = (id: string) => {
    const profile = profiles.value.find(p => p.id === id)
    if (!profile) return
    activeId.value = id
    try {
      localStorage.setItem(ACTIVE_KEY, id)
    } catch {
      // non-persistent context
    }
    applyProfile(profile)
  }

  // Apply the persisted profile as soon as the store is created so API calls
  // made before the first component render already target the right server.
  applyProfile(activeProfile.value)

  return { profiles, activeId, activeProfile, addProfile, updateProfile, deleteProfile, setActive }
})
