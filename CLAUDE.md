# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Admin UI for [MediaMTX](https://github.com/bluenviron/mediamtx) streaming media server. Built with Vue 3 (Composition API + `<script setup>`), TypeScript, Vite, Element Plus, Pinia, and ECharts. The UI is in English.

## Commands

- `npm run dev` — Start dev server on port 3001 (proxies `/api/*` to `http://localhost:9997`)
- `npm run dev:api` — Build and start MediaMTX with API enabled (requires Go)
- `npm run build` — Type-check with vue-tsc then build with Vite
- `npm run preview` — Preview production build
- No test framework configured

## Architecture

**Data flow**: Vue views → Pinia stores → API modules (axios) → MediaMTX v3 REST API (`/v3/...`)

- `src/types/api.ts` — All TypeScript types matching MediaMTX Go structs (`internal/defs/api*.go`). Single source of truth.
- `src/api/` — Axios-based API modules. Central instance in `index.ts` (baseURL `/api`, response interceptor unwraps `.data`). One file per API resource.
- `src/stores/` — Pinia stores (Composition API). Each store owns reactive state + async actions. Stores receive unwrapped responses (no `.data` access needed).
- `src/views/` — Page components: Home (dashboard with ECharts + bandwidth trend), Paths, PathsConfig, connection views (RTSP Conn/Session, RTMP, WebRTC, HLS Muxers, SRT), Recordings, Config.
- `src/components/` — Reusable UI: `StreamPlayer.vue` (WHEP playback), `CopyLinkButton.vue` (per-protocol stream URL copy), `PathLink.vue` (cross-links a connection's path back to the Paths view).
- `src/composables/` — Shared composables: `useFormatters.ts`, `useAutoRefresh.ts` (interval polling), `usePagination.ts`, `useErrorMessage.ts` (surfaces real API error bodies), `useClipboard.ts`, `useCountUp.ts` (dashboard number animation), `useStreamUrls.ts` / `useRecordingPlayback.ts` (URL builders), `useWebRTCPlayer.ts` (WHEP client).
- `src/stores/activity.ts` — Session-scoped log of admin actions (kicks, saves, deletes), surfaced via the header's activity bell.
- `src/router/index.ts` — Routes with lazy loading. Route guard sets document title.
- `src/style.css` — Global styles with CSS custom properties for light/dark theming, including full tonal ramps for primary/success/warning/danger/info (needed for Element Plus message/tag/alert backgrounds — see comments in the file before changing base colors).

## Key API Mapping

MediaMTX API has distinct concepts:
- **Paths** (`/v3/paths/`) — Live path state (online, source, readers, traffic). Read-only.
- **Path Config** (`/v3/config/paths/`) — Path configuration CRUD.
- **RTSP Connections** (`/v3/rtspconns/`) — Read-only, no kick.
- **RTSP Sessions** (`/v3/rtspsessions/`) — Support kick.
- **RTMP Connections** (`/v3/rtmpconns/`) — Support kick.
- **HLS Muxers** (`/v3/hlsmuxers/`) — Read-only, no kick.
- **SRT Connections** (`/v3/srtconns/`) — Support kick.
- **Info** (`/v3/info`) — Server version and start time.

## Code Style

- **Formatting**: Prettier — no semicolons, single quotes, 100 char width, no trailing commas
- **Linting**: ESLint with vue3-recommended + TypeScript
- **Path alias**: `@/` maps to `src/`
- **TypeScript**: Strict mode, no unused locals/parameters

## Development Setup

1. Start MediaMTX with API: `npm run dev:api` (or manually: `cd ../mediamtx && go build . && ./mediamtx ../mediamtx-ui/mediamtx-dev.yml`)
2. Start UI: `npm run dev`
3. Open http://localhost:3001
