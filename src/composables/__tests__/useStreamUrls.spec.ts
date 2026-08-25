import { describe, it, expect } from 'vitest'
import {
  streamConfigFromConfig,
  buildStreamUrls,
  buildWhepUrl,
  playbackPortFromConfig,
  type StreamUrlPorts,
  type StreamUrlEnabled
} from '@/composables/useStreamUrls'

describe('streamConfigFromConfig', () => {
  it('extracts ports, enabled flags and encryption from the global config', () => {
    const cfg = {
      rtspAddress: ':8554',
      rtspsAddress: ':8322',
      rtmpAddress: ':1935',
      rtmpEncryption: 'strict',
      webrtc: false
    }
    const result = streamConfigFromConfig(cfg)
    expect(result.ports.rtsp).toBe(8554)
    expect(result.ports.rtsps).toBe(8322)
    expect(result.ports.rtmp).toBe(1935)
    expect(result.enabled.webrtc).toBe(false)
    expect(result.encryption.rtmp).toBe('strict')
  })

  it('ignores unknown encryption values', () => {
    const result = streamConfigFromConfig({ rtspEncryption: 'weird' })
    expect(result.encryption.rtsp).toBeUndefined()
  })
})

describe('buildStreamUrls', () => {
  const ports: StreamUrlPorts = { rtsp: 8554, rtmp: 1935, hls: 8888, webrtc: 8889, srt: 8890 }
  const enabled: StreamUrlEnabled = { rtsp: true, rtmp: true, hls: true, webrtc: true, srt: true }

  it('uses rtsp:// when encryption is off', () => {
    const urls = buildStreamUrls('cam', ports, enabled, 'http', { rtsp: 'no' })
    expect(urls.find(u => u.protocol === 'rtsp')?.url).toMatch(/^rtsp:\/\//)
  })

  it('uses rtsps:// when encryption is optional or strict', () => {
    for (const mode of ['optional', 'strict'] as const) {
      const urls = buildStreamUrls('cam', ports, enabled, 'http', { rtsp: mode })
      expect(urls.find(u => u.protocol === 'rtsp')?.url).toMatch(/^rtsps:\/\//)
      expect(urls.find(u => u.protocol === 'rtsp')?.label).toBe('RTSPS')
    }
  })

  it('uses rtmps:// with the rtmps port when RTMP encryption is enforced', () => {
    const urls = buildStreamUrls('cam', ports, enabled, 'http', { rtmp: 'strict' })
    const rtmp = urls.find(u => u.protocol === 'rtmp')
    expect(rtmp?.url).toMatch(/^rtmps:\/\//)
    expect(rtmp?.url).toContain(':1935')
  })

  it('filters out disabled protocols', () => {
    const urls = buildStreamUrls('cam', ports, { rtsp: false }, 'http', {})
    expect(urls.find(u => u.protocol === 'rtsp')).toBeUndefined()
    expect(urls.length).toBe(4)
  })

  it('encodes path segments while preserving slashes', () => {
    const urls = buildStreamUrls('cam area/1', ports, enabled, 'http', {})
    expect(urls.find(u => u.protocol === 'rtsp')?.url).toContain('cam%20area/1')
  })

  it('returns an empty array for an empty path', () => {
    expect(buildStreamUrls('', ports, enabled, 'http', {})).toEqual([])
  })
})

describe('buildWhepUrl', () => {
  it('uses plain http by default', () => {
    expect(buildWhepUrl('cam', 8889)).toBe(`http://${window.location.hostname}:8889/cam/whep`)
  })

  it('uses https when the UI is behind a TLS edge', () => {
    expect(buildWhepUrl('cam', 8889, 'https')).toBe(
      `https://${window.location.hostname}:8889/cam/whep`
    )
  })
})

describe('playbackPortFromConfig', () => {
  it('reads the playback port from the config', () => {
    expect(playbackPortFromConfig({ playbackAddress: ':7777' })).toBe(7777)
  })

  it('falls back to the default port', () => {
    expect(playbackPortFromConfig({})).toBe(9996)
  })
})
