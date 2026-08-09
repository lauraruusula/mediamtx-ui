export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US')
}

export function formatUptime(startedStr: string | null | undefined): string {
  if (!startedStr) return '-'
  const started = new Date(startedStr)
  if (isNaN(started.getTime())) return '-'
  const now = Date.now()
  const diff = Math.floor((now - started.getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`
  if (diff < 86400) {
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    return `${h}h ${m}m`
  }
  const d = Math.floor(diff / 86400)
  const h = Math.floor((diff % 86400) / 3600)
  return `${d}d ${h}h`
}

// MediaMTX's /v3/info already returns a "v"-prefixed version (e.g. "v1.20.0").
// Normalize so callers can safely prefix "v" without ever producing "vv1.20.0".
export function formatVersion(version: string | null | undefined): string {
  if (!version) return '-'
  return version.startsWith('v') ? version : `v${version}`
}

export function formatRelativeTime(epochMs: number): string {
  const diff = Math.floor((Date.now() - epochMs) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function formatState(state: string): string {
  const map: Record<string, string> = {
    idle: 'Idle',
    read: 'Reading',
    publish: 'Publishing'
  }
  return map[state] || state
}

export function formatDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null || !Number.isFinite(seconds)) return '-'
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm ? `${h}h ${mm}m` : `${h}h`
}

export function formatSourceType(type: string): string {
  const map: Record<string, string> = {
    rtspSource: 'RTSP Source',
    rtspSession: 'RTSP Session',
    rtmpSource: 'RTMP Source',
    rtmpConn: 'RTMP Connection',
    rtmpsConn: 'RTMPS Connection',
    hlsSource: 'HLS Source',
    webRTCSession: 'WebRTC Session',
    webRTCSource: 'WebRTC Source',
    srtConn: 'SRT Connection',
    srtSource: 'SRT Source',
    rtspsSession: 'RTSPS Session',
    rtspsConn: 'RTSPS Connection',
    rtspConn: 'RTSP Connection',
    hlsMuxer: 'HLS Muxer',
    rpiCameraSource: 'RPi Camera',
    rpiCameraSecondary: 'RPi Camera (Secondary)',
    redirect: 'Redirect',
    mpegtsSource: 'MPEG-TS Source',
    rtpSource: 'RTP Source'
  }
  return map[type] || type
}
