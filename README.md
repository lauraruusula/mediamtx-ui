# MediaMTX Admin UI

A modern web admin dashboard for [MediaMTX](https://github.com/bluenviron/mediamtx) streaming media server, built with Vue 3 and TypeScript.

## Features

- **Dashboard** — Live KPIs, source-type and protocol charts, a persistent split inbound/outbound bandwidth trend (survives reloads), server health (version/uptime), a path frame-errors health KPI, and active paths with in-browser WebRTC (WHEP) preview and copy-link; auto-refresh (on by default) with interval control and an API unreachable banner
- **Path Status** — Search, status filter (online/available/offline), sortable columns, pagination, CSV export, health badges, a persistent per-path traffic sparkline, and a detail drawer with per-protocol URLs (RTSP/RTMP/HLS/WebRTC/SRT from live config, respecting encryption mode), codec tracks, timestamps, and a traffic sparkline
- **Path Config** — Add/edit/duplicate/delete path configs: source & on-demand, publish/read auth, recording, run-on hooks, advanced options (IP allowlists, override publish, record durations), and a Path Defaults tab that new paths inherit; search, pagination, and CSV export
- **Forward destinations** — Configure per-path forwarding (RTSP/RTSPS, RTMP/RTMPS, SRT, WHIP/WHIPS) from the Path Config page — TLS fingerprint and WHIP bearer-token support — and monitor live per-destination state (idle/forwarding/error), error details, outbound traffic, and creation time with auto-refresh
- **Connections** — Searchable, sortable, paginated tables with CSV export across RTSP connections (read-only), RTSP sessions, RTMP, WebRTC, HLS muxers (read-only), and SRT; health badges and per-session detail drawers; single and bulk kick where the API supports it; path links back to Path Status
- **Protocol awareness** — Disabled protocols are hidden from nav and the command palette; deep links show an empty state with a jump to the matching System Config tab
- **Recordings** — Browse by path with search/sort/pagination/CSV; a 26-week activity heatmap with click-to-filter; open a segment drawer (optional date filter) showing total duration with a copyable full playback URL and a bulk delete for the filtered range; play segments in-browser via hls.js (controls, picture-in-picture, stats overlay); download or delete segments via MediaMTX playback
- **System Config** — Edit common global settings (logging, auth, protocols, API, recording, playback) with dirty tracking, save confirmation, leave warnings, JWT JWKS refresh, field search that jumps straight to the setting, and a syntax-highlighted raw JSON editor for fields the form doesn't expose
- **Stream player** — In-browser WebRTC (WHEP) playback with play/pause, picture-in-picture, and live stats
- **Command palette** — `⌘K` / `Ctrl+K` to jump to pages or find paths and recordings by name
- **Keyboard shortcuts** — `g` then `p`/`r`/`c`/`h` jumps to Path Status / Recordings / System Config / Dashboard; `?` shows the reference
- **Recent activity & notifications** — Session-scoped header log of admin actions plus path online/offline alerts and degradation alerts (inbound frame errors), with optional opt-in desktop notifications for those transitions
- **Read-only detection** — if the API answers writes with 403, a banner appears and save/delete controls disable
- **Theme & layout** — Light/dark theme; top navigation that becomes a mobile slide-over below 1024px
- **Live list controls** — Auto-refresh toggles with interval (5s/15s/30s), last-updated hints, theme-aware toasts, and list error banners with retry
- **Testing** — Vitest unit tests (48 cases) for stream URLs, recording playback, stream health, and path notifications

## Version History

### v2.3.1 — 2026-08-18 (latest)

- **Forward drawer fixes** — live status no longer shows another path's data between opens, live-status failures (e.g. an offline path) show a quiet inline hint instead of an error banner, the table no longer flashes its loading mask on every auto-refresh tick, and the add/edit dialog closes with the drawer
- **Tests** — unit coverage for the credential-redaction payload logic (MediaMTX 1.20.1)
- **Accessibility** — the Path Config forward-count tag is now keyboard reachable

### v2.3.0 — 2026-08-18

- **Forward destinations** — configure per-path forwarding (RTSP/RTSPS, RTMP/RTMPS, SRT, WHIP/WHIPS) from the Path Config page, with TLS fingerprint and WHIP bearer-token support
- **Forwarding monitor** — live per-destination state (idle/forwarding/error), error details, outbound traffic, and creation time, with auto-refresh
- **MediaMTX 1.20.1 compatibility** — passwords are redacted to `<redacted>` in API responses and are now preserved on save instead of being overwritten; MoQ and HLS-session source/reader types are labeled correctly
- **Forward count column** — Path Config shows how many destinations each path forwards to, plus a Forward action on every row

### v2.2.0 — 2026-08-18

- **Stream health monitoring** — health badges across connection and path lists, per-session detail drawers, and a dashboard frame-errors KPI
- **Recording playback** — hls.js in-browser playback with controls, picture-in-picture, and a stats overlay; total duration and copyable full playback URL
- **Richer path details** — codec tracks, timestamps, and a traffic sparkline in the path drawer
- **Path Defaults** — new config tab with defaults every path inherits; expanded config fields and a raw JSON editor in System Config
- **Persistent bandwidth trend** — split inbound/outbound chart that survives reloads
- **Browser notifications** — opt-in desktop notifications for path online/offline transitions
- **WebRTC player** — play/pause, picture-in-picture, and live stats
- **Encryption-aware URLs** — RTSP/RTMP stream URLs respect the configured encryption mode
- **Cross-links** — live tag linking path config to status, recordings to their path, and palette actions
- **Vitest** — test setup with 48 unit tests for core composables
- **Fixes** — Safari native-HLS listener leak, unbounded retry loop, reactive JSON-validity in the config editor, track bitrate display

### v2.1.3 — 2026-08-11

- README features aligned with the real UI

### v2.1.2 — 2026-08-11

- README refresh; dropped unused docs and assets

### v2.1.1 — 2026-08-11

- Auto-refresh resumes on reload and refreshes immediately when toggled on
- Header server status stays honest on every page via lightweight probes
- Optimized dashboard polling (paths every 5s, protocol counts every 15s, info once) and deduped alert polling
- Cached recordings list during search; command palette fetch capped at 200 entries
- Lazy-mounted System Config tabs and a refresh-interval selector on Home
- Fixed inert sort controls on Recordings; dropped the redundant `(Ns)` label suffix

### v2.1.0 — 2026-08-11

- Friendly empty state when a protocol is disabled: hidden from nav and the command palette, with a jump link to System Config instead of a raw 404

### v2.0.1 — 2026-08-11

- Added the version-bump rule and project setup tooling

### v2.0.0 — 2026-08-11

- Major redesign of the dashboard, paths, connections, recordings, and config pages
- Command palette, bulk kick, error banners with retry, CSV export, and search/sort/pagination polish
- Accessibility and security audit fixes

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
| Video Playback   | hls.js (recording segments)              |
| Testing          | Vitest + happy-dom                       |

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

### Serving with Caddy (SPA deep links)

This is a client-side-routed SPA (web history mode), so the server must fall back unknown paths to `index.html` — otherwise deep links and reloads on routes like `/paths/config` return 404. The dashboard is served from `http://localhost:3001` by this Caddyfile:

```
localhost:3001 {
	root * /absolute/path/to/mediamtx-ui/dist
	file_server
	try_files {path} /index.html
	handle_path /api/* {
		reverse_proxy 127.0.0.1:9997
	}
	# Optional: gate the whole UI (and API) behind basic auth.
	# basic_auth {
	# 	admin $2a$14$…
	# }
}
```

`handle_path /api/*` forwards the `/api` prefix and strips it, so the dashboard's requests to `/v3/...` reach MediaMTX's Control API. The `try_files` fallback is what makes deep links and page reloads work. For production, put the UI and API behind TLS and an auth layer (see Security notes below).

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

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Start Vite dev server on port 3001               |
| `npm run dev:api`       | Build and run MediaMTX with `mediamtx-dev.yml`   |
| `npm run build`         | Type-check (`vue-tsc`) then production build     |
| `npm run preview`       | Preview the production build                     |
| `npm run lint`          | Run ESLint                                       |
| `npm run format`        | Format `src/` with Prettier                      |
| `npm run format:check`  | Check Prettier formatting                        |
| `npm run test`          | Run Vitest unit tests                            |
| `npm run test:watch`    | Run Vitest in watch mode                         |

## API Compatibility

All API calls target **MediaMTX v3 REST API** (`/v3/...`). The type definitions in `src/types/api.ts` are derived from the MediaMTX Go source (`internal/defs/api*.go`).

Compatibility notes:

- **MediaMTX ≥ 1.20.1** — the API redacts credentials to `<redacted>` in responses. Untouched passwords are preserved on save; forward destinations are edited through the path config's `forward` array and monitored via `/v3/paths/forward/list`.

## Security & Deployment Notes

- **Auth is the deployment's job.** This UI has no login; whoever can reach it controls MediaMTX (config saves, kicks, deletions). Put it behind a reverse proxy with auth (e.g. Caddy Basic auth or a forward-auth gateway) in anything but a trusted LAN.
- **API bearer token.** If you front the MediaMTX API with auth, you can set a token once per session via `setApiToken()` (from `src/api/index.ts`); every request then carries `Authorization: Bearer <token>`. There's no login screen — wire it into your own loader or gate.
- **CSP.** `index.html` ships a Content-Security-Policy meta tag (`script-src 'self'`, `object-src 'none'`, etc.). For clickjacking protection (`frame-ancestors`) and strict `connect-src`, set headers at the edge instead — the in-app CSP must keep `connect-src` open because playback reaches MediaMTX protocol ports directly.
- **Credentials on screen.** MediaMTX only redacts `*Pass` fields; path `source` URLs and forward `dest` URLs that embed `user:password@` are masked for display and in CSV exports by the app. Avoid screenshotting or sharing the Path Config page with source URLs visible.
- **Dev servers.** The Vite dev server (`host: true`) and `mediamtx-dev.yml` (`apiAllowOrigins: ['*']`) are intentionally open for LAN development — don't reuse them for production.

## Feedback

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/lauraruusula/mediamtx-ui/issues).

## License

MIT
