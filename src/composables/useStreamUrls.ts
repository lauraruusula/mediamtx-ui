export interface StreamUrl {
  protocol: string
  label: string
  url: string
}

// MediaMTX's default ports (as shipped in mediamtx.yml). If the server has
// been reconfigured with different addresses these will be wrong, but they're
// the best default we can offer without fetching the live global config for
// every row of every table.
const DEFAULT_PORTS = {
  rtsp: 8554,
  rtmp: 1935,
  hls: 8888,
  webrtc: 8889,
  srt: 8890
}

export function buildStreamUrls(pathName: string): StreamUrl[] {
  if (!pathName) return []

  const host = window.location.hostname
  // Encode each path segment individually so names with special characters
  // can't alter the URL's structure, while preserving intentional slashes.
  const p = pathName.split('/').map(encodeURIComponent).join('/')

  return [
    { protocol: 'rtsp', label: 'RTSP', url: `rtsp://${host}:${DEFAULT_PORTS.rtsp}/${p}` },
    { protocol: 'rtmp', label: 'RTMP', url: `rtmp://${host}:${DEFAULT_PORTS.rtmp}/${p}` },
    { protocol: 'hls', label: 'HLS', url: `http://${host}:${DEFAULT_PORTS.hls}/${p}/index.m3u8` },
    {
      protocol: 'webrtc',
      label: 'WebRTC (WHEP)',
      url: `http://${host}:${DEFAULT_PORTS.webrtc}/${p}/whep`
    },
    { protocol: 'srt', label: 'SRT', url: `srt://${host}:${DEFAULT_PORTS.srt}?streamid=read:${p}` }
  ]
}
