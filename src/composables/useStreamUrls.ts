export interface StreamUrl {
  protocol: string
  label: string
  url: string
}

export type StreamProtocol = 'rtsp' | 'rtmp' | 'hls' | 'webrtc' | 'srt'

// MediaMTX's default ports (as shipped in mediamtx.yml). Overridden by the
// server's live global config when it's available (see streamConfigFromConfig),
// so copy/paste links reflect real addresses instead of shipped defaults.
const DEFAULT_PORTS: Record<StreamProtocol, number> = {
  rtsp: 8554,
  rtmp: 1935,
  hls: 8888,
  webrtc: 8889,
  srt: 8890
}

export type StreamUrlPorts = Partial<Record<StreamProtocol, number>>
export type StreamUrlEnabled = Partial<Record<StreamProtocol, boolean>>

export interface StreamUrlConfig {
  ports: StreamUrlPorts
  enabled: StreamUrlEnabled
}

const PROTOCOL_ADDRESS_KEY: Record<StreamProtocol, string> = {
  rtsp: 'rtspAddress',
  rtmp: 'rtmpAddress',
  hls: 'hlsAddress',
  webrtc: 'webrtcAddress',
  srt: 'srtAddress'
}

// MediaMTX addresses look like ":8554" or "0.0.0.0:8554" (and may carry a
// scheme, e.g. "udp://:5004") — the port is the trailing :N.
const portOf = (address: string | undefined): number | undefined => {
  if (!address) return undefined
  const m = String(address).match(/:(\d+)$/)
  return m ? parseInt(m[1], 10) : undefined
}

/**
 * Extracts the live port + enabled flag for each protocol from the global
 * config. A protocol is only marked disabled when the config explicitly says
 * so (MediaMTX omits flags it considers default), so older configs that lack
 * the field keep every protocol enabled.
 */
export function streamConfigFromConfig(config: Record<string, any>): StreamUrlConfig {
  const ports: StreamUrlPorts = {}
  const enabled: StreamUrlEnabled = {}
  for (const protocol of Object.keys(PROTOCOL_ADDRESS_KEY) as StreamProtocol[]) {
    const port = portOf(config[PROTOCOL_ADDRESS_KEY[protocol]])
    if (port) ports[protocol] = port
    const flag = config[protocol]
    if (flag !== undefined) enabled[protocol] = flag === true
  }
  return { ports, enabled }
}

export function buildStreamUrls(
  pathName: string,
  ports: StreamUrlPorts = {},
  enabled: StreamUrlEnabled = {},
  httpScheme: 'http' | 'https' = 'http'
): StreamUrl[] {
  if (!pathName) return []

  const host = window.location.hostname
  // Encode each path segment individually so names with special characters
  // can't alter the URL's structure, while preserving intentional slashes.
  const p = pathName.split('/').map(encodeURIComponent).join('/')

  const port = (protocol: StreamProtocol) => ports[protocol] ?? DEFAULT_PORTS[protocol]

  const urls: Record<StreamProtocol, StreamUrl> = {
    rtsp: { protocol: 'rtsp', label: 'RTSP', url: `rtsp://${host}:${port('rtsp')}/${p}` },
    rtmp: { protocol: 'rtmp', label: 'RTMP', url: `rtmp://${host}:${port('rtmp')}/${p}` },
    hls: {
      protocol: 'hls',
      label: 'HLS',
      url: `${httpScheme}://${host}:${port('hls')}/${p}/index.m3u8`
    },
    webrtc: {
      protocol: 'webrtc',
      label: 'WebRTC (WHEP)',
      url: `${httpScheme}://${host}:${port('webrtc')}/${p}/whep`
    },
    srt: { protocol: 'srt', label: 'SRT', url: `srt://${host}:${port('srt')}?streamid=read:${p}` }
  }

  return (Object.keys(urls) as StreamProtocol[])
    .filter(protocol => enabled[protocol] !== false)
    .map(protocol => urls[protocol])
}

// MediaMTX's WebRTC server has no TLS support, so the WHEP playback endpoint
// must always use http (an https-served UI would otherwise hand the player an
// unreachable https:// target). Copy-links may use https via buildStreamUrls.
export function buildWhepUrl(pathName: string, port = DEFAULT_PORTS.webrtc): string {
  const encodedPath = pathName.split('/').map(encodeURIComponent).join('/')
  return `http://${window.location.hostname}:${port}/${encodedPath}/whep`
}
