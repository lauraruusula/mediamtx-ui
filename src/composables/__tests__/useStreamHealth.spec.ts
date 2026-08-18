import { describe, it, expect } from 'vitest'
import {
  lossRate,
  rateLevel,
  formatRate,
  healthTagType,
  pathHealth,
  rtspSessionHealth,
  webrtcSessionHealth,
  srtConnHealth,
  discardedFramesHealth
} from '@/composables/useStreamHealth'

describe('lossRate', () => {
  it('returns null when there is no total to derive a ratio from', () => {
    expect(lossRate(5, undefined)).toBeNull()
    expect(lossRate(5, 0)).toBeNull()
    expect(lossRate(5, null)).toBeNull()
  })

  it('computes the lost/total ratio', () => {
    expect(lossRate(10, 1000)).toBeCloseTo(0.01)
    expect(lossRate(0, 100)).toBe(0)
  })
})

describe('rateLevel', () => {
  it('treats unknown rates as healthy', () => {
    expect(rateLevel(null)).toBe('good')
  })

  it('classifies rates against the 0.5% / 2% thresholds', () => {
    expect(rateLevel(0)).toBe('good')
    expect(rateLevel(0.004)).toBe('good')
    expect(rateLevel(0.01)).toBe('warn')
    expect(rateLevel(0.019)).toBe('warn')
    expect(rateLevel(0.05)).toBe('bad')
  })
})

describe('formatRate', () => {
  it('renders a percentage with one decimal', () => {
    expect(formatRate(0.01)).toBe('1.0%')
  })

  it('renders an empty string for unknown rates', () => {
    expect(formatRate(null)).toBe('')
  })
})

describe('healthTagType', () => {
  it('maps levels to Element Plus tag types', () => {
    expect(healthTagType('good')).toBe('success')
    expect(healthTagType('warn')).toBe('warning')
    expect(healthTagType('bad')).toBe('danger')
  })
})

describe('pathHealth', () => {
  it('shows a dash for offline paths', () => {
    expect(pathHealth({ online: false })).toEqual({ level: 'good', label: '—' })
  })

  it('reports healthy online paths with no errors', () => {
    expect(pathHealth({ online: true, inboundFramesInError: 0 })).toEqual({
      level: 'good',
      label: 'Healthy'
    })
  })

  it('flags paths with frame errors', () => {
    expect(pathHealth({ online: true, inboundFramesInError: 3 })).toEqual({
      level: 'warn',
      label: '3 frame errors'
    })
  })
})

describe('rtspSessionHealth', () => {
  it('reports healthy sessions with minimal loss', () => {
    expect(rtspSessionHealth({ inboundRTPPackets: 1000, inboundRTPPacketsLost: 1 })).toEqual({
      level: 'good',
      label: 'Healthy'
    })
  })

  it('prioritizes packet errors over loss rate', () => {
    expect(
      rtspSessionHealth({
        inboundRTPPackets: 1000,
        inboundRTPPacketsLost: 0,
        inboundRTPPacketsInError: 4
      })
    ).toEqual({ level: 'warn', label: '4 packet errors' })
  })

  it('labels significant loss with its rate', () => {
    expect(rtspSessionHealth({ inboundRTPPackets: 100, inboundRTPPacketsLost: 20 })).toEqual({
      level: 'bad',
      label: 'Loss 20.0%'
    })
  })
})

describe('webrtcSessionHealth', () => {
  it('reports healthy when stats are missing', () => {
    expect(webrtcSessionHealth({})).toEqual({ level: 'good', label: 'Healthy' })
  })

  it('warns on elevated loss', () => {
    expect(webrtcSessionHealth({ inboundRTPPackets: 100, inboundRTPPacketsLost: 1 })).toEqual({
      level: 'warn',
      label: 'Loss 1.0%'
    })
  })

  it('marks heavy loss as bad', () => {
    expect(webrtcSessionHealth({ inboundRTPPackets: 100, inboundRTPPacketsLost: 5 })).toEqual({
      level: 'bad',
      label: 'Loss 5.0%'
    })
  })
})

describe('srtConnHealth', () => {
  it('uses the worst of send/receive loss', () => {
    const health = srtConnHealth({
      packetsSent: 100,
      packetsSendLoss: 1,
      packetsReceived: 100,
      packetsReceivedLoss: 10
    })
    expect(health.level).toBe('bad')
    expect(health.label).toBe('Loss 10.0%')
  })

  it('stays healthy with no loss stats', () => {
    expect(srtConnHealth({})).toEqual({ level: 'good', label: 'Healthy' })
  })
})

describe('discardedFramesHealth', () => {
  it('is healthy when nothing was discarded', () => {
    expect(discardedFramesHealth(0)).toEqual({ level: 'good', label: 'Healthy' })
    expect(discardedFramesHealth(null)).toEqual({ level: 'good', label: 'Healthy' })
  })

  it('warns when frames were dropped', () => {
    expect(discardedFramesHealth(7)).toEqual({ level: 'warn', label: '7 frames dropped' })
  })
})
