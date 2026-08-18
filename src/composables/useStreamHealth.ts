export type HealthLevel = 'good' | 'warn' | 'bad'

export interface HealthInfo {
  level: HealthLevel
  label: string
}

// Loss ratio lost/total; null when there's nothing to compute a ratio from.
export function lossRate(lost?: number | null, total?: number | null): number | null {
  if (!total || total <= 0) return null
  return (lost || 0) / total
}

// Thresholds are deliberately forgiving: <0.5% is normal for real networks,
// 0.5–2% is worth watching, >2% is a stream that's visibly degrading.
export function rateLevel(rate: number | null): HealthLevel {
  if (rate === null) return 'good'
  if (rate < 0.005) return 'good'
  if (rate < 0.02) return 'warn'
  return 'bad'
}

export function formatRate(rate: number | null): string {
  return rate === null ? '' : `${(rate * 100).toFixed(1)}%`
}

export function healthTagType(level: HealthLevel): 'success' | 'warning' | 'danger' {
  return level === 'good' ? 'success' : level === 'warn' ? 'warning' : 'danger'
}

// Paths only expose a cumulative error counter, so any error while online is
// worth flagging; there's no total to derive a ratio from.
export function pathHealth(p: {
  online?: boolean
  inboundFramesInError?: number | null
}): HealthInfo {
  if (!p.online) return { level: 'good', label: '—' }
  const errors = p.inboundFramesInError || 0
  if (errors === 0) return { level: 'good', label: 'Healthy' }
  return { level: 'warn', label: `${errors} frame errors` }
}

export function rtspSessionHealth(s: {
  inboundRTPPackets?: number | null
  inboundRTPPacketsLost?: number | null
  inboundRTPPacketsInError?: number | null
}): HealthInfo {
  const rate = lossRate(s.inboundRTPPacketsLost, s.inboundRTPPackets)
  if ((s.inboundRTPPacketsInError || 0) > 0) {
    return { level: 'warn', label: `${s.inboundRTPPacketsInError} packet errors` }
  }
  const level = rateLevel(rate)
  return level === 'good'
    ? { level, label: 'Healthy' }
    : { level, label: `Loss ${formatRate(rate)}` }
}

export function webrtcSessionHealth(s: {
  inboundRTPPackets?: number | null
  inboundRTPPacketsLost?: number | null
}): HealthInfo {
  const rate = lossRate(s.inboundRTPPacketsLost, s.inboundRTPPackets)
  const level = rateLevel(rate)
  return level === 'good'
    ? { level, label: 'Healthy' }
    : { level, label: `Loss ${formatRate(rate)}` }
}

export function srtConnHealth(s: {
  packetsSent?: number | null
  packetsReceived?: number | null
  packetsSendLoss?: number | null
  packetsReceivedLoss?: number | null
}): HealthInfo {
  const rates = [
    lossRate(s.packetsReceivedLoss, s.packetsReceived),
    lossRate(s.packetsSendLoss, s.packetsSent)
  ]
  const nonNull = rates.filter((r): r is number => r !== null)
  if (nonNull.length === 0) return { level: 'good', label: 'Healthy' }
  const worst = Math.max(...nonNull)
  const level = rateLevel(worst)
  return level === 'good'
    ? { level, label: 'Healthy' }
    : { level, label: `Loss ${formatRate(worst)}` }
}

// RTMP/HLS surface dropped frames rather than packet loss.
export function discardedFramesHealth(discarded?: number | null): HealthInfo {
  if (!discarded || discarded <= 0) return { level: 'good', label: 'Healthy' }
  return { level: 'warn', label: `${discarded} frames dropped` }
}
