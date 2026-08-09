export interface StreamUrl {
  protocol: string
  label: string
  url: string
}

// MediaMTX's default ports (as shipped in mediamtx.yml). Overridden by the
// server's live global config when it's available (see portsFromConfig), so
// copy/paste links reflect real addresses instead of shipped defaults.
const DEFAULT_PORTS = {
  rtsp: 8554,
  rtmp: 1935,
  hls: 8888,
  webrtc: 8889,
  srt: 8890
}

export type StreamUrlPorts = Partial<typeof DEFAULT_PORTS>

// MediaMTX addresses look like ":8554" or "0.0.0.0:8554" (and may carry a
// scheme, e.g. "udp://:5004") — the port is the trailing :N.
const portOf = (address: string | undefined): number | undefined => {
  if (!address) return undefined
  const m = String(address).match(/:(\d+)$/)
  return m ? parseInt(m[1], 10) : undefined
}

/** Extracts the port each protocol actually listens on from the live config. */
export function portsFromConfig(config: Record<string, any>): StreamUrlPorts {
  const map: Record<string, keyof StreamUrlPorts> = {
    rtspAddress: 'rtsp',
    rtmpAddress: 'rtmp',
    hlsAddress: 'hls',
    webrtcAddress: 'webrtc',
    srtAddress: 'srt'
  }
  const ports: StreamUrlPorts = {}
  for (const [key, protocol] of Object.entries(map)) {
    const port = portOf(config[key])
    if (port) ports[protocol] = port
  }
  return ports
}

export function buildStreamUrls(pathName: string, ports: StreamUrlPorts = {}): StreamUrl[] {
  if (!pathName) return []

  const host = window.location.hostname
  // Encode each path segment individually so names with special characters
  // can't alter the URL's structure, while preserving intentional slashes.
  const p = pathName.split('/').map(encodeURIComponent).join('/')

  const port = (protocol: keyof StreamUrlPorts) => ports[protocol] ?? DEFAULT_PORTS[protocol]

  return [
    { protocol: 'rtsp', label: 'RTSP', url: `rtsp://${host}:${port('rtsp')}/${p}` },
    { protocol: 'rtmp', label: 'RTMP', url: `rtmp://${host}:${port('rtmp')}/${p}` },
    { protocol: 'hls', label: 'HLS', url: `http://${host}:${port('hls')}/${p}/index.m3u8` },
    {
      protocol: 'webrtc',
      label: 'WebRTC (WHEP)',
      url: `http://${host}:${port('webrtc')}/${p}/whep`
    },
    { protocol: 'srt', label: 'SRT', url: `srt://${host}:${port('srt')}?streamid=read:${p}` }
  ]
}
