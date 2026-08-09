import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ActivityLevel = 'success' | 'error' | 'info'

export interface ActivityEntry {
  id: number
  message: string
  level: ActivityLevel
  at: number // epoch ms
}

const MAX_ENTRIES = 30

/**
 * Session-scoped, in-memory log of admin actions taken through this UI
 * (kicks, config saves, deletes, ...). MediaMTX itself has no audit-log API,
 * so this is intentionally ephemeral — it resets on reload — but it gives
 * an admin a quick "what did I just do" trail without leaving the page.
 */
export const useActivityStore = defineStore('activity', () => {
  const entries = ref<ActivityEntry[]>([])
  const unread = ref(0)

  let nextId = 1

  const log = (message: string, level: ActivityLevel = 'info') => {
    entries.value.unshift({ id: nextId++, message, level, at: Date.now() })
    if (entries.value.length > MAX_ENTRIES) entries.value.length = MAX_ENTRIES
    unread.value += 1
  }

  const markRead = () => {
    unread.value = 0
  }

  const clear = () => {
    entries.value = []
    unread.value = 0
  }

  return { entries, unread, log, markRead, clear }
})
