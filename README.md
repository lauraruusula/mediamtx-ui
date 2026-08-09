# MediaMTX Admin UI

[中文](README_zh.md) | English

A modern web admin dashboard for [MediaMTX](https://github.com/bluenviron/mediamtx) streaming media server, built with Vue 3 and TypeScript.

## Features

- **Dashboard** — Live overview with auto-refreshing stat tiles (animated on update), source-type/protocol charts, a rolling bandwidth trend chart, and a connection-lost banner if the API becomes unreachable
- **Path Management** — Live path status with search, sortable columns, and pagination; a detail drawer with per-protocol stream links (RTSP/RTMP/HLS/WebRTC/SRT) ready to copy
- **Path Configuration** — Full editor covering source, on-demand pulling, publish/read authentication, per-path recording, and run-on-ready hooks
- **Connection Management** — Sortable, paginated tables across all protocols, with one-click kick where the API supports it:
  - RTSP Connections (read-only) & Sessions (kickable)
  - RTMP Connections (kickable)
  - WebRTC Sessions (kickable)
  - HLS Muxers (read-only)
  - SRT Connections (kickable)
- **Recording Management** — Browse recordings, play or download individual segments (via MediaMTX's playback server), delete segments
- **Global Configuration** — Edit all MediaMTX server settings, with unsaved-changes tracking, a confirm-before-apply step, and a JWT JWKS refresh action
- **Recent Activity** — Session-scoped log of admin actions (kicks, saves, deletes) in the header
- **Theme Switching** — Light / Dark theme with a cohesive, WCAG-conscious color system (tags, toasts, and alerts all follow the active theme)
- **Responsive** — Collapsible sidebar and mobile-friendly layout

## Tech Stack

| Category          | Technology                                 |
| ------------------ | ------------------------------------------- |
| Framework          | Vue 3 (Composition API, `<script setup>`)   |
| Language            | TypeScript (strict mode)                    |
| Build Tool          | Vite                                        |
| UI Library          | Element Plus                                |
| State Management    | Pinia                                       |
| Charts              | ECharts + vue-echarts                       |
| HTTP Client         | Axios                                       |
| Router              | Vue Router 4                                |

## Prerequisites

- Node.js >= 16
- npm >= 7
- [MediaMTX](https://github.com/bluenviron/mediamtx) server with API enabled

## Quick Start

### 1. Start MediaMTX with API enabled

Option A — Use the included dev config (requires Go):

```bash
npm run dev:api
```

Option B — Start MediaMTX manually with `api: true` in your config:

```yaml
api: true
apiAddress: :9997
```

### 2. Start the UI dev server

```bash
npm install
npm run dev
```

### 3. Open in browser

```
http://localhost:3001
```

The dev server proxies `/api/*` requests to `http://localhost:9997` (MediaMTX API) and `/webrtc/*` to `http://localhost:8889` (MediaMTX WebRTC server).

## Build

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file server and proxy `/api/*` to your MediaMTX instance. Recording playback/download additionally requires MediaMTX's playback server (`playback: yes`, default port `9996`) to be reachable from the browser.

## Project Structure

```
src/
├── api/            # Axios API modules (one per resource)
├── components/     # Reusable UI (stream player, copy-link button, path cross-link)
├── composables/    # Shared composables (formatters, pagination, auto-refresh, clipboard, ...)
├── router/         # Vue Router config with lazy loading
├── stores/         # Pinia stores (one per resource, plus a session-scoped activity log)
├── types/          # TypeScript types matching MediaMTX API
├── views/          # Page components
├── App.vue         # Layout (sidebar + header + main)
├── main.ts         # App entry (Element Plus, ECharts, Router, Pinia)
└── style.css       # Global styles with CSS custom properties
```

## API Compatibility

All API calls target **MediaMTX v3 REST API** (`/v3/...`). The type definitions in `src/types/api.ts` are derived from the MediaMTX Go source code (`internal/defs/api*.go`).

## Feedback

This is a personal fork. Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/lauraruusula/mediamtx-ui/issues).

## License

MIT
