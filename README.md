# MediaMTX Admin UI

A modern web admin dashboard for [MediaMTX](https://github.com/bluenviron/mediamtx) streaming media server, built with Vue 3 and TypeScript.

## Features

- **Dashboard** — Live KPIs, source-type and protocol charts, a session-local bandwidth trend, server health (version/uptime), and active paths with WHEP preview and copy-link; auto-refresh (on by default) with interval control and an API unreachable banner
- **Path Status** — Search, status filter (online/available/offline), sortable columns, pagination, CSV export, detail drawer with per-protocol URLs (RTSP/RTMP/HLS/WebRTC/SRT from live config), and in-browser WebRTC (WHEP) playback
- **Path Config** — Add/edit/duplicate/delete path configs: source & on-demand, publish/read auth, recording, run-on hooks, and advanced options (IP allowlists, override publish, record durations); search, pagination, and CSV export
- **Connections** — Searchable, sortable, paginated tables with CSV export across RTSP connections (read-only), RTSP sessions, RTMP, WebRTC, HLS muxers (read-only), and SRT; single and bulk kick where the API supports it; path links back to Path Status
- **Protocol awareness** — Disabled protocols are hidden from nav and the command palette; deep links show an empty state with a jump to the matching System Config tab
- **Recordings** — Browse by path with search/sort/pagination/CSV; open a segment drawer (optional date filter) to play, download, or delete segments via MediaMTX playback
- **System Config** — Edit common global settings (logging, auth, protocols, API, recording, playback) with dirty tracking, save confirmation, leave warnings, and JWT JWKS refresh
- **Command palette** — `⌘K` / `Ctrl+K` to jump to pages or find paths and recordings by name
- **Recent activity** — Session-scoped header log of admin actions plus path online/offline alerts
- **Theme & layout** — Light/dark theme; top navigation that becomes a mobile slide-over below 1024px
- **Live list controls** — Auto-refresh toggles with interval (5s/15s/30s), last-updated hints, theme-aware toasts, and list error banners with retry

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
