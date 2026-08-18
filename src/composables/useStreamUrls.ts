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

// RTSPS uses a distinct default port; RTMPS shares RTMP's port (the listener
// serves both, switching on the handshake).
const DEFAULT_ENCRYPTED_PORTS: Record<'rtsps' | 'rtmps', number> = {
  rtsps: 8322,
  rtmps: 1935
}

export type StreamUrlPorts = Partial<Record<StreamProtocol | 'rtsps' | 'rtmps', number>>
export type StreamUrlEnabled = Partial<Record<StreamProtocol, boolean>>
export type StreamEncryption = Partial<Record<StreamProtocol, 'no' | 'optional' | 'strict'>>

export interface StreamUrlConfig {
  ports: StreamUrlPorts
  enabled: StreamUrlEnabled
  encryption: StreamEncryption
}

const PROTOCOL_ADDRESS_KEY: Record<StreamProtocol, string> = {
  rtsp: 'rtspAddress',
  rtmp: 'rtmpAddress',
  hls: 'hlsAddress',
  webrtc: 'webrtcAddress',
  srt: 'srtAddress'
}

const ENCRYPTED_ADDRESS_KEY: Partial<Record<'rtsps' | 'rtmps', string>> = {
  rtsps: 'rtspsAddress',
  rtmps: 'rtmpsAddress'
}

// Which protocol each encryption flag applies to. HLS/WebRTC use their own
// (boolean) encryption toggles and never touch these string values.
const ENCRYPTION_FLAG: Partial<Record<StreamProtocol, string>> = {
  rtsp: 'rtspEncryption',
  rtmp: 'rtmpEncryption'
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
  const encryption: StreamEncryption = {}
  for (const protocol of Object.keys(PROTOCOL_ADDRESS_KEY) as StreamProtocol[]) {
    const port = portOf(config[PROTOCOL_ADDRESS_KEY[protocol]])
    if (port) ports[protocol] = port
    const flag = config[protocol]
    if (flag !== undefined) enabled[protocol] = flag === true
    const enc = config[ENCRYPTION_FLAG[protocol]!]
    if (enc === 'no' || enc === 'optional' || enc === 'strict') {
      encryption[protocol] = enc
    }
  }
  for (const [key, addressKey] of Object.entries(ENCRYPTED_ADDRESS_KEY)) {
    const port = portOf(config[addressKey])
    if (port) ports[key as 'rtsps' | 'rtmps'] = port
  }
  return { ports, enabled, encryption }
}

// When a protocol is set to enforce or allow TLS, advertise the encrypted
// variant (RTSPS/RTMPS) so copied links actually work against a strict server.
const rtspScheme = (encryption: StreamEncryption) =>
  encryption.rtsp && encryption.rtsp !== 'no' ? 'rtsps' : 'rtsp'
const rtmpScheme = (encryption: StreamEncryption) =>
  encryption.rtmp && encryption.rtmp !== 'no' ? 'rtmps' : 'rtmp'

export function buildStreamUrls(
  pathName: string,
  ports: StreamUrlPorts = {},
  enabled: StreamUrlEnabled = {},
  httpScheme: 'http' | 'https' = 'http',
  encryption: StreamEncryption = {}
): StreamUrl[] {
  if (!pathName) return []

  const host = window.location.hostname
  // Encode each path segment individually so names with special characters
  // can't alter the URL's structure, while preserving intentional slashes.
  const p = pathName.split('/').map(encodeURIComponent).join('/')

  const port = (protocol: StreamProtocol) => ports[protocol] ?? DEFAULT_PORTS[protocol]
  const rtspsPort = ports.rtsps ?? DEFAULT_ENCRYPTED_PORTS.rtsps
  const rtmpsPort = ports.rtmps ?? ports.rtmp ?? DEFAULT_ENCRYPTED_PORTS.rtmps

  const isRtsps = rtspScheme(encryption) === 'rtsps'
  const isRtmps = rtmpScheme(encryption) === 'rtmps'

  const urls: Record<StreamProtocol, StreamUrl> = {
    rtsp: {
      protocol: 'rtsp',
      label: isRtsps ? 'RTSPS' : 'RTSP',
      url: `${isRtsps ? 'rtsps' : 'rtsp'}://${host}:${isRtsps ? rtspsPort : port('rtsp')}/${p}`
    },
    rtmp: {
      protocol: 'rtmp',
      label: isRtmps ? 'RTMPS' : 'RTMP',
      url: `${isRtmps ? 'rtmps' : 'rtmp'}://${host}:${isRtmps ? rtmpsPort : port('rtmp')}/${p}`
    },
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

// MediaMTX's built-in playback server defaults to port 9996 and can be moved
// via `playbackAddress` in the global config. Reading the live address keeps
// recording links pointing at the real server instead of a hard-coded port.
const DEFAULT_PLAYBACK_PORT = 9996

export function playbackPortFromConfig(config: Record<string, any>): number {
  const port = portOf(config.playbackAddress)
  return port ?? DEFAULT_PLAYBACK_PORT
}
