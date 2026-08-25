// Browser notifications for path online/offline transitions.
//
// The app already tracks transitions for the activity bell; this module adds
// desktop notifications on top, gated on explicit user opt-in (persisted) and
// the browser granting permission. Notifications only fire while the page
// isn't focused, so a user actively watching the UI isn't double-notified.

const STORAGE_KEY = 'notify:enabled'
const OFFLINE_THRESHOLD_KEY = 'notify:offline-threshold-seconds'

let enabled = false
let knownOnline: Record<string, boolean> = {}
let baselineSeeded = false

// Health-change tracking: when a path starts (or stops) reporting inbound
// frame errors, an optional follow-up notification fires — the stream can be
// degrading even while it stays online.
let knownHealth: Record<string, number> = {}
let healthBaselineSeeded = false

// Sustained-outage tracking: when a path goes offline, a timer remembers when
// it dropped; if it's still down after the configured threshold and the user
// isn't looking at the page, a follow-up notification fires once per episode.
let offlineThresholdSeconds = 0
const offlineSince: Record<string, number> = {}
const offlineNotified: Record<string, number> = {}

function load() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function loadOfflineThreshold(): number {
  try {
    const n = Number(localStorage.getItem(OFFLINE_THRESHOLD_KEY))
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // non-persistent context — fine to skip
  }
}

function saveOfflineThreshold() {
  try {
    localStorage.setItem(OFFLINE_THRESHOLD_KEY, String(offlineThresholdSeconds))
  } catch {
    // non-persistent context — fine to skip
  }
}

enabled = load()
offlineThresholdSeconds = loadOfflineThreshold()

export function notificationsEnabled(): boolean {
  return enabled
}

export function setNotificationsEnabled(value: boolean) {
  enabled = value
  if (!value) {
    // Drop the baseline and outage tracking so re-enabling doesn't replay
    // stale transitions or fire "still offline" for long-gone episodes.
    knownOnline = {}
    baselineSeeded = false
    knownHealth = {}
    healthBaselineSeeded = false
    resetOutageTracking()
  }
  save()
}

/** Seconds a path must stay offline before a follow-up notification fires. 0 = off. */
export function offlineThreshold(): number {
  return offlineThresholdSeconds
}

export function setOfflineThreshold(seconds: number) {
  offlineThresholdSeconds = seconds > 0 ? seconds : 0
  if (!offlineThresholdSeconds) resetOutageTracking()
  saveOfflineThreshold()
}

function resetOutageTracking() {
  for (const k of Object.keys(offlineSince)) delete offlineSince[k]
  for (const k of Object.keys(offlineNotified)) delete offlineNotified[k]
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
  fireNotification(
    online ? 'Path online' : 'Path offline',
    online ? `"${pathName}" started publishing` : `"${pathName}" stopped publishing`,
    `path:${pathName}:${online}`,
    pathName
  )
}

function fireNotification(title: string, body: string, tag: string, pathName: string) {
  // Only bother the user when they're not looking at the page.
  if (typeof document !== 'undefined' && document.hasFocus()) return
  try {
    const notification = new Notification(title, {
      body,
      tag,
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
 * path); subsequent calls notify for transitions and track offline episodes.
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
      if (!now) {
        // Just went offline — start the sustained-outage timer.
        offlineSince[name] = Date.now()
      } else {
        // Back online — clear any pending "still offline" state.
        delete offlineSince[name]
        delete offlineNotified[name]
      }
      fire(name, now)
    }
  }
  knownOnline = current
}

/**
 * Called on the same poll cadence as notifyPathTransitions. Fires one
 * "still offline" notification per path once it has been down for longer
 * than the configured threshold — for spotting streams that dropped and
 * never came back without relying on a transition edge.
 */
export function checkSustainedOutages(items: { name: string; online: boolean }[]) {
  if (!enabled || offlineThresholdSeconds <= 0) return
  const thresholdMs = offlineThresholdSeconds * 1000
  for (const p of items) {
    if (p.online) continue
    const since = offlineSince[p.name]
    if (since === undefined) continue
    if (offlineNotified[p.name] === since) continue
    if (Date.now() - since >= thresholdMs) {
      offlineNotified[p.name] = since
      fireNotification(
        'Path still offline',
        `"${p.name}" has been down for ${offlineThresholdSeconds}s`,
        `path:${p.name}:still-offline`,
        p.name
      )
    }
  }
}

/**
 * Feed the same path poll as notifyPathTransitions. Notifies once when a
 * path starts reporting inbound frame errors and once when it clears — a
 * stream can be visibly degrading while staying online, and an admin wants
 * to know before it drops.
 */
export function notifyPathHealth(items: { name: string; inboundFramesInError?: number | null }[]) {
  if (!enabled) return
  const current: Record<string, number> = {}
  for (const p of items) current[p.name] = p.inboundFramesInError || 0

  if (!healthBaselineSeeded) {
    knownHealth = current
    healthBaselineSeeded = true
    return
  }

  for (const [name, errors] of Object.entries(current)) {
    const was = knownHealth[name]
    if (was === undefined || was === errors) continue
    if (errors > 0) {
      fireNotification(
        'Path degraded',
        `"${name}" is reporting ${errors} inbound frame ${errors === 1 ? 'error' : 'errors'}`,
        `path:${name}:degraded`,
        name
      )
    } else if (was > 0) {
      fireNotification(
        'Path recovered',
        `"${name}" stopped reporting inbound frame errors`,
        `path:${name}:recovered`,
        name
      )
    }
  }
  knownHealth = current
}

/** Re-seed the health baseline silently (e.g. after a pause, to avoid replaying stale transitions). */
export function reseedPathHealth(items: { name: string; inboundFramesInError?: number | null }[]) {
  knownHealth = {}
  for (const p of items) knownHealth[p.name] = p.inboundFramesInError || 0
  healthBaselineSeeded = true
}

/** Re-seed the baseline silently (e.g. after a pause, to avoid replaying stale transitions). */
export function reseedPathBaseline(items: { name: string; online: boolean }[]) {
  knownOnline = {}
  for (const p of items) knownOnline[p.name] = p.online
  baselineSeeded = true
}
