<template>
  <div class="stream-player">
    <video
      ref="videoEl"
      autoplay
      playsinline
      muted
      @click="togglePlay"
      @dblclick="toggleFullscreen"
    />

    <!-- Overlay: connecting / error / paused -->
    <div v-if="player.state.value !== 'connected' && !isPaused" class="player-overlay">
      <template v-if="player.state.value === 'connecting'">
        <el-icon class="spin" :size="36"><Loading /></el-icon>
        <span class="overlay-text">Connecting...</span>
      </template>
      <template v-else-if="player.state.value === 'reconnecting'">
        <el-icon class="spin" :size="36"><Loading /></el-icon>
        <span class="overlay-text">{{ player.error.value || 'Reconnecting...' }}</span>
      </template>
      <template v-else-if="player.state.value === 'error'">
        <el-icon :size="36" color="var(--el-color-danger)"><CircleCloseFilled /></el-icon>
        <span class="overlay-text">{{ player.error.value || 'Connection failed' }}</span>
        <el-button type="primary" size="small" style="margin-top: 8px" @click="retry"
          >Retry</el-button
        >
      </template>
      <template v-else>
        <el-icon :size="36" color="var(--el-color-info)"><VideoPlay /></el-icon>
        <span class="overlay-text">Waiting to play</span>
      </template>
    </div>

    <!-- Center play button while paused -->
    <button v-if="isPaused" class="center-play" aria-label="Play" @click="togglePlay">
      <el-icon :size="40"><VideoPlay /></el-icon>
    </button>

    <!-- Bottom toolbar -->
    <div
      class="player-toolbar"
      :class="{ visible: showControls || player.state.value !== 'connected' || isPaused }"
    >
      <div class="toolbar-left">
        <el-button
          text
          size="small"
          class="toolbar-btn"
          :aria-label="isPaused ? 'Play' : 'Pause'"
          @click="togglePlay"
        >
          <el-icon :size="18">
            <VideoPause v-if="!isPaused" />
            <VideoPlay v-else />
          </el-icon>
        </el-button>
        <el-tag size="small" type="success" effect="dark">WebRTC</el-tag>
        <span class="path-label">{{ pathName }}</span>
      </div>
      <div class="toolbar-right">
        <el-button
          text
          size="small"
          class="toolbar-btn"
          :aria-label="isMuted ? 'Unmute' : 'Mute'"
          @click="toggleMute"
        >
          <el-icon :size="18">
            <Mute v-if="isMuted" />
            <Microphone v-else />
          </el-icon>
        </el-button>
        <el-slider
          v-model="volume"
          class="volume-slider"
          :max="100"
          :show-tooltip="false"
          aria-label="Volume"
          @input="setVolume"
        />
        <el-button
          v-if="pipSupported"
          text
          size="small"
          class="toolbar-btn"
          aria-label="Toggle picture in picture"
          @click="togglePip"
        >
          <el-icon :size="18"><Rank /></el-icon>
        </el-button>
        <el-button
          text
          size="small"
          class="toolbar-btn"
          :class="{ active: statsVisible }"
          aria-label="Toggle stats"
          @click="statsVisible = !statsVisible"
        >
          <el-icon :size="18"><DataAnalysis /></el-icon>
        </el-button>
        <el-button
          text
          size="small"
          class="toolbar-btn"
          aria-label="Toggle fullscreen"
          @click="toggleFullscreen"
        >
          <el-icon :size="18"><FullScreen /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- Stats overlay -->
    <div v-if="statsVisible" class="stats-panel">
      <div class="stats-row">
        <span>Resolution</span><strong>{{ stats.resolution }}</strong>
      </div>
      <div class="stats-row">
        <span>Bitrate</span><strong>{{ stats.bitrate }}</strong>
      </div>
      <div class="stats-row">
        <span>RTT</span><strong>{{ stats.rtt }}</strong>
      </div>
      <div class="stats-row">
        <span>Dropped frames</span><strong>{{ stats.dropped }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useWebRTCPlayer } from '@/composables/useWebRTCPlayer'
import { useConfigStore } from '@/stores/config'
import { streamConfigFromConfig, buildWhepUrl } from '@/composables/useStreamUrls'
import {
  Loading,
  CircleCloseFilled,
  VideoPlay,
  VideoPause,
  Mute,
  Microphone,
  Rank,
  DataAnalysis,
  FullScreen
} from '@element-plus/icons-vue'

const props = defineProps<{
  pathName: string
  whepBaseUrl?: string
}>()

const videoEl = ref<HTMLVideoElement | null>(null)
const player = useWebRTCPlayer(videoEl)
const showControls = ref(true)
const isMuted = ref(true)
const volume = ref(100)
const isPaused = ref(false)
const statsVisible = ref(false)
const pipSupported =
  typeof document !== 'undefined' && 'requestPictureInPicture' in HTMLVideoElement.prototype

const stats = ref({ resolution: '—', bitrate: '—', rtt: '—', dropped: '—' })
let lastBytes = 0
let lastBytesAt = 0
let statsTimer: ReturnType<typeof setInterval> | null = null

const configStore = useConfigStore()
const whepPort = ref(8889)
let controlsTimer: ReturnType<typeof setTimeout> | null = null
// Set on unmount. The player dialog uses destroy-on-close, so the config
// promise may still be resolving when this component is torn down — without
// this guard it would start a connection (and possibly an endless retry loop)
// on a component that no longer exists.
let disposed = false

// Resolve the live WebRTC port from the server's global config before the first
// connect (falls back to the default 8889). Never rejects.
const configReady = (async () => {
  try {
    const cfg = await configStore.ensureLoaded()
    const { ports } = streamConfigFromConfig(cfg)
    if (ports.webrtc) whepPort.value = ports.webrtc
  } catch {
    // keep the default port
  }
})()

function getWhepUrl() {
  // Encode each path segment individually so names with special characters
  // (spaces, '?', '#', etc.) can't alter the URL's structure, while still
  // allowing legitimate hierarchical path names ("cam/1") to keep their slashes.
  if (props.whepBaseUrl) {
    const encodedPath = props.pathName.split('/').map(encodeURIComponent).join('/')
    return `${props.whepBaseUrl}/${encodedPath}/whep`
  }
  // Direct connection to the MediaMTX WebRTC server (Vite proxy interferes with
  // WHEP protocol headers). Always http — the WHEP server has no TLS support.
  return buildWhepUrl(props.pathName, whepPort.value)
}

function startPlayer() {
  if (disposed) return
  player.connect(getWhepUrl())
}

function retry() {
  if (disposed) return
  startPlayer()
}

function togglePlay() {
  const el = videoEl.value
  if (!el) return
  if (el.paused) {
    el.play().catch(() => {})
  } else {
    el.pause()
  }
  resetControlsTimer()
}

function toggleMute() {
  if (videoEl.value) {
    videoEl.value.muted = !videoEl.value.muted
    isMuted.value = videoEl.value.muted
  }
}

function setVolume(v: number | number[]) {
  const value = Array.isArray(v) ? v[0] : v
  if (videoEl.value) {
    videoEl.value.volume = value / 100
    if (value === 0) {
      // A zeroed slider is effectively muted — keep the mute button in sync.
      videoEl.value.muted = true
      isMuted.value = true
    } else if (videoEl.value.muted) {
      // Dragging the slider back up also unmutes.
      videoEl.value.muted = false
      isMuted.value = false
    }
  }
}

function toggleFullscreen() {
  const el = videoEl.value
  if (!el) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    el.requestFullscreen()
  }
}

async function togglePip() {
  const el = videoEl.value
  if (!el) return
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
    } else {
      await el.requestPictureInPicture()
    }
  } catch {
    // PiP unavailable for this stream — ignore
  }
}

async function updateStats() {
  const el = videoEl.value
  if (!el) return
  if (el.videoWidth) stats.value.resolution = `${el.videoWidth}×${el.videoHeight}`
  const quality = el.getVideoPlaybackQuality?.()
  if (quality) stats.value.dropped = String(quality.droppedVideoFrames || 0)

  const report = await player.getStats()
  if (!report) return
  let bytes = 0
  let rtt: number | null = null
  report.forEach(stat => {
    if (stat.type === 'inbound-rtp' && (stat.mediaType === 'video' || stat.kind === 'video')) {
      bytes = stat.bytesReceived || 0
    }
    if (stat.type === 'candidate-pair' && stat.nominated && stat.state === 'succeeded') {
      // `currentRoundTripTime` isn't on the base RTCStats type.
      rtt = (stat as any).currentRoundTripTime ?? null
    }
  })
  const now = performance.now()
  if (lastBytesAt && bytes >= lastBytes) {
    const bps = ((bytes - lastBytes) * 8000) / (now - lastBytesAt)
    stats.value.bitrate = `${(bps / 1e6).toFixed(2)} Mbps`
  }
  lastBytes = bytes
  lastBytesAt = now
  stats.value.rtt = rtt != null ? `${Math.round(rtt * 1000)} ms` : '—'
}

function resetControlsTimer() {
  if (controlsTimer) clearTimeout(controlsTimer)
  if (showControls.value) {
    controlsTimer = setTimeout(() => {
      showControls.value = false
    }, 3000)
  }
}

watch(
  () => props.pathName,
  () => {
    player.disconnect()
    configReady.then(() => startPlayer())
  }
)

watch(
  () => player.state.value,
  state => {
    if (state === 'connected') {
      statsVisible.value = false
    }
  }
)

onMounted(() => {
  videoEl.value?.addEventListener('pause', () => {
    isPaused.value = true
  })
  videoEl.value?.addEventListener('play', () => {
    isPaused.value = false
  })
  configReady.then(() => startPlayer())
  statsTimer = setInterval(() => {
    if (statsVisible.value) updateStats()
  }, 1000)
})

onBeforeUnmount(() => {
  disposed = true
  player.disconnect()
  if (controlsTimer) clearTimeout(controlsTimer)
  if (statsTimer) clearInterval(statsTimer)
})
</script>

<style scoped>
.stream-player {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: var(--radius-md, 10px);
  overflow: hidden;
  aspect-ratio: 16 / 9;
  box-shadow: var(--shadow-sm);
}

.stream-player video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.player-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  gap: 8px;
  z-index: 1;
}

.overlay-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.player-toolbar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  opacity: 0;
  transition: opacity 0.3s;
  z-index: 2;
}

.player-toolbar.visible {
  opacity: 1;
}

.stream-player:hover .player-toolbar {
  opacity: 1;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.path-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-btn {
  color: #fff !important;
}

.toolbar-btn:hover {
  color: var(--el-color-primary) !important;
}

.volume-slider {
  width: 80px;
  margin: 0 8px;
}

.volume-slider :deep(.el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.28);
}

.volume-slider :deep(.el-slider__bar) {
  background-color: #fff;
}

.volume-slider :deep(.el-slider__button) {
  width: 12px;
  height: 12px;
  border-color: #fff;
  background-color: #fff;
}

.volume-slider :deep(.el-slider__button-wrapper) {
  top: -17px;
}

.center-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: background-color 0.2s ease;
}

.center-play:hover {
  background: rgba(0, 0, 0, 0.75);
}

.toolbar-btn.active {
  color: var(--el-color-primary) !important;
}

.stats-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 3;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  min-width: 180px;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 2px 0;
}

.stats-row span {
  color: rgba(255, 255, 255, 0.65);
}

.stats-row strong {
  font-variant-numeric: tabular-nums;
}
</style>
