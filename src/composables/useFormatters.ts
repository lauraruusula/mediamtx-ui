export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
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

export function formatState(state: string): string {
  const map: Record<string, string> = {
    idle: 'Idle',
    read: 'Reading',
    publish: 'Publishing'
  }
  return map[state] || state
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
    rpiCameraSource: 'RPi Camera',
    redirect: 'Redirect',
    mpegtsSource: 'MPEG-TS Source',
    rtpSource: 'RTP Source'
  }
  return map[type] || type
}
