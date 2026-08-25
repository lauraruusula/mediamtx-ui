import axios from 'axios'
import { ref } from 'vue'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// Set when the API answers a write (PATCH/POST/PUT/DELETE) with 403, which is
// what MediaMTX returns for a read-only user or a `readonly: true` API. Views
// read this to show a banner and disable destructive controls. Cleared again
// once a write succeeds (or when switching server profiles).
export const apiReadOnly = ref(false)

const WRITE_METHODS = new Set(['patch', 'post', 'put', 'delete'])

// Multi-server profiles switch the API endpoint at runtime. Empty restores the
// default same-origin proxy path. Switched base URLs are absolute (scheme +
// host + optional prefix) and bypass the dev proxy, so the target server must
// allow CORS.
export function setApiBaseUrl(url: string): void {
  api.defaults.baseURL = (url || '').trim() || '/api'
  apiReadOnly.value = false
}

// API authentication state. MediaMTX's internal auth expects HTTP Basic
// credentials on every request (users with `action: api`); JWT-based auth
// expects a bearer token. Both are supported here, persisted per origin.
export type ApiAuth =
  { kind: 'basic'; user: string; pass: string } | { kind: 'bearer'; token: string }

const AUTH_STORAGE_KEY = 'api:auth'

// Only one 401 needs to surface the login dialog — the boot burst fires many.
let authRequiredNotified = false
const authRequiredListeners = new Set<() => void>()

export function getApiAuth(): ApiAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.kind === 'basic' && typeof parsed.user === 'string') return parsed
    if (parsed?.kind === 'bearer' && typeof parsed.token === 'string') return parsed
    return null
  } catch {
    return null
  }
}

export function setApiAuth(auth: ApiAuth): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
  } catch {
    // non-persistent context — the session just won't survive a reload
  }
}

export function clearApiAuth(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // nothing to clear
  }
}

// Backwards-compatible token helpers for deployments that issue a JWT
// externally (see README). Stored through the same unified auth state.
export function getApiToken(): string | null {
  const auth = getApiAuth()
  return auth?.kind === 'bearer' ? auth.token : null
}

export function setApiToken(token: string): void {
  setApiAuth({ kind: 'bearer', token })
}

export function clearApiToken(): void {
  clearApiAuth()
}

/** Subscribe to "the API answered 401 and we don't have credentials yet". */
export function onApiAuthRequired(listener: () => void): () => void {
  authRequiredListeners.add(listener)
  return () => authRequiredListeners.delete(listener)
}

function notifyAuthRequired() {
  if (authRequiredNotified) return
  authRequiredNotified = true
  authRequiredListeners.forEach(listener => listener())
}

// UTF-8-safe Basic credentials (btoa alone breaks on non-Latin-1 characters).
function basicHeader(user: string, pass: string): string {
  const bytes = new TextEncoder().encode(`${user}:${pass}`)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `Basic ${btoa(binary)}`
}

api.interceptors.request.use(config => {
  const auth = getApiAuth()
  if (auth) {
    config.headers.Authorization =
      auth.kind === 'bearer' ? `Bearer ${auth.token}` : basicHeader(auth.user, auth.pass)
  }
  return config
})

api.interceptors.response.use(
  response => {
    if (response.config.method && WRITE_METHODS.has(response.config.method)) {
      apiReadOnly.value = false
    }
    return response.data
  },
  error => {
    if (error.response?.status === 401) notifyAuthRequired()
    const method = error.config?.method
    if (error.response?.status === 403 && method && WRITE_METHODS.has(method)) {
      apiReadOnly.value = true
    }
    return Promise.reject(error)
  }
)

export default api

export * from './system'
export * from './globalConfig'
export * from './pathsConfig'
export * from './auth'
export * from './rtspConn'
export * from './rtspSession'
export * from './rtmpConn'
export * from './srtConn'
export * from './webrtc'
export * from './hlsMuxer'
export * from './forwardDests'
export * from './recordings'
