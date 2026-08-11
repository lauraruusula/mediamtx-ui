# MediaMTX Admin UI

A modern web admin dashboard for [MediaMTX](https://github.com/bluenviron/mediamtx) streaming media server, built with Vue 3 and TypeScript.

## Features

- **Dashboard** — Live overview with auto-refreshing stat tiles, source-type/protocol charts, a rolling bandwidth trend chart, and a connection-lost banner if the API becomes unreachable
- **Path Management** — Live path status with search, sortable columns, pagination, CSV export, and a detail drawer with per-protocol stream links (RTSP/RTMP/HLS/WebRTC/SRT) plus in-browser WebRTC (WHEP) preview
- **Path Configuration** — Full editor covering source, on-demand pulling, publish/read authentication, per-path recording, and run-on-ready hooks
- **Connection Management** — Sortable, searchable, paginated tables across all protocols, with CSV export, bulk kick, and one-click kick where the API supports it:
  - RTSP Connections (read-only) & Sessions (kickable)
  - RTMP Connections (kickable)
  - WebRTC Sessions (kickable)
  - HLS Muxers (read-only)
  - SRT Connections (kickable)
- **Protocol awareness** — Friendly empty state when a protocol is disabled in MediaMTX config, with a link to enable it
- **Recording Management** — Browse recordings, play or download individual segments (via MediaMTX's playback server), delete segments
- **Global Configuration** — Edit all MediaMTX server settings, with unsaved-changes tracking, a confirm-before-apply step, and a JWT JWKS refresh action
- **Command Palette** — Keyboard-driven navigation and actions (`⌘K` / `Ctrl+K`)
- **Recent Activity** — Session-scoped log of admin actions (kicks, saves, deletes) in the header
- **Theme Switching** — Light / Dark theme with a cohesive color system (tags, toasts, and alerts follow the active theme)
- **Responsive** — Collapsible sidebar and mobile-friendly layout

## Tech Stack

| Category         | Technology                               |
| ---------------- | ---------------------------------------- |
| Framework        | Vue 3 (Composition API, `<script setup>`) |
| Language         | TypeScript (strict mode)                 |
| Build Tool       | Vite                                     |
| UI Library       | Element Plus                             |
| State Management | Pinia                                    |
| Charts           | ECharts + vue-echarts                    |
| HTTP Client      | Axios                                    |
| Router           | Vue Router 4                             |

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`
- npm >= 10
- [MediaMTX](https://github.com/bluenviron/mediamtx) server with API enabled

## Quick Start

### 1. Start MediaMTX with API enabled

Option A — Use the included dev config (requires Go and a sibling `../mediamtx` checkout):

```bash
npm run dev:api
```

Option B — Start MediaMTX manually with API enabled:

```yaml
api: true
apiAddress: :9997
apiAllowOrigins: ['*']
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

The dev server proxies `/api/*` to `http://localhost:9997` (MediaMTX Control API). Stream playback (WebRTC WHEP) and recording playback talk to MediaMTX protocol ports directly in the browser (defaults: WebRTC `:8889`, playback `:9996`).

## Build

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file server and proxy `/api/*` to your MediaMTX Control API. Recording playback/download additionally requires MediaMTX's playback server (`playback: yes`, default port `9996`) to be reachable from the browser.

## Project Structure

```
src/
├── api/            # Axios API modules (one per resource)
├── components/     # Reusable UI (player, command palette, copy-link, …)
├── composables/    # Shared logic (formatters, refresh, bulk kick, toasts, …)
├── router/         # Vue Router config with lazy loading
├── stores/         # Pinia stores (one per resource + activity log)
├── types/          # TypeScript types matching MediaMTX API
├── views/          # Page components
├── App.vue         # Layout (sidebar + header + main)
├── main.ts         # App entry
└── style.css       # Global styles with CSS custom properties
```

## Scripts

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Start Vite dev server on port 3001               |
| `npm run dev:api`    | Build and run MediaMTX with `mediamtx-dev.yml`   |
| `npm run build`      | Type-check (`vue-tsc`) then production build     |
| `npm run preview`    | Preview the production build                     |
| `npm run lint`       | Run ESLint                                       |
| `npm run format`     | Format `src/` with Prettier                      |

## API Compatibility

All API calls target **MediaMTX v3 REST API** (`/v3/...`). The type definitions in `src/types/api.ts` are derived from the MediaMTX Go source (`internal/defs/api*.go`).

## Feedback

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/lauraruusula/mediamtx-ui/issues).

## License

MIT
