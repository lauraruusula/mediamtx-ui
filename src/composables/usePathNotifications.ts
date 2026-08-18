// Browser notifications for path online/offline transitions.
//
// The app already tracks transitions for the activity bell; this module adds
// desktop notifications on top, gated on explicit user opt-in (persisted) and
// the browser granting permission. Notifications only fire while the page
// isn't focused, so a user actively watching the UI isn't double-notified.

const STORAGE_KEY = 'notify:enabled'

let enabled = false
let knownOnline: Record<string, boolean> = {}
let baselineSeeded = false

function load() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // non-persistent context — fine to skip
  }
}

enabled = load()

export function notificationsEnabled(): boolean {
  return enabled
}

export function setNotificationsEnabled(value: boolean) {
  enabled = value
  if (!value) {
    // Drop the baseline so re-enabling doesn't replay stale transitions.
    knownOnline = {}
    baselineSeeded = false
  }
  save()
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (notificationPermission() === 'unsupported') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function fire(pathName: string, online: boolean) {
  // Only bother the user when they're not looking at the page.
  if (typeof document !== 'undefined' && document.hasFocus()) return
  try {
    const notification = new Notification(online ? 'Path online' : 'Path offline', {
      body: online ? `"${pathName}" started publishing` : `"${pathName}" stopped publishing`,
      tag: `path:${pathName}:${online}`,
      icon: '/favicon.svg'
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
      // Jump to the Paths page filtered to the affected path (web-history
      // routing, so no hash fragment).
      const base = import.meta.env.BASE_URL.replace(/\/+$/, '')
      window.location.href = `${window.location.origin}${base}/paths?q=${encodeURIComponent(pathName)}`
    }
  } catch {
    // Notification constructors can throw in some sandboxed contexts — ignore.
  }
}

/**
 * Feed every path poll through here. The first call seeds the baseline
 * silently (so enabling mid-session doesn't notify for every pre-existing
 * path); subsequent calls notify for transitions.
 */
export function notifyPathTransitions(items: { name: string; online: boolean }[]) {
  if (!enabled) return
  const current: Record<string, boolean> = {}
  for (const p of items) current[p.name] = p.online

  if (!baselineSeeded) {
    knownOnline = current
    baselineSeeded = true
    return
  }

  const names = new Set([...Object.keys(knownOnline), ...Object.keys(current)])
  for (const name of names) {
    const was = knownOnline[name]
    const now = current[name]
    if (was !== undefined && now !== undefined && was !== now) {
      fire(name, now)
    }
  }
  knownOnline = current
}

/** Re-seed the baseline silently (e.g. after a pause, to avoid replaying stale transitions). */
export function reseedPathBaseline(items: { name: string; online: boolean }[]) {
  knownOnline = {}
  for (const p of items) knownOnline[p.name] = p.online
  baselineSeeded = true
}
