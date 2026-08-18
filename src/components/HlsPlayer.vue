<template>
  <div class="hls-player">
    <video
      ref="videoEl"
      playsinline
      :autoplay="autoplay"
      :muted="autoplay"
      @click="togglePlay"
      @dblclick="toggleFullscreen"
      @play="playing = true"
      @pause="playing = false"
    />

    <!-- Overlay: loading / error -->
    <div v-if="status === 'loading'" class="player-overlay">
      <el-icon class="spin" :size="36"><Loading /></el-icon>
      <span class="overlay-text">Loading stream…</span>
    </div>
    <div v-else-if="status === 'error'" class="player-overlay">
      <el-icon :size="36" color="var(--el-color-danger)"><CircleCloseFilled /></el-icon>
      <span class="overlay-text">{{ errorMessage || 'Playback failed' }}</span>
      <el-button type="primary" size="small" style="margin-top: 8px" @click="init">Retry</el-button>
    </div>

    <!-- Bottom toolbar -->
    <div class="player-toolbar" :class="{ visible: showControls }">
      <div class="toolbar-left">
        <el-button
          text
          size="small"
          class="toolbar-btn"
          :aria-label="playing ? 'Pause' : 'Play'"
          @click="togglePlay"
        >
          <el-icon :size="18">
            <VideoPause v-if="playing" />
            <VideoPlay v-else />
          </el-icon>
        </el-button>
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
        <span class="path-label">{{ title }}</span>
      </div>
      <div class="toolbar-right">
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
        <span>Buffer</span><strong>{{ stats.buffer }}</strong>
      </div>
      <div class="stats-row">
        <span>Dropped frames</span><strong>{{ stats.dropped }}</strong>
      </div>
      <div class="stats-row">
        <span>Latency</span><strong>{{ stats.latency }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import Hls from 'hls.js'
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

const props = withDefaults(
  defineProps<{
    src: string
    title?: string
    autoplay?: boolean
  }>(),
  { title: '', autoplay: true }
)

type PlayerStatus = 'loading' | 'ready' | 'error'

const videoEl = ref<HTMLVideoElement | null>(null)
const status = ref<PlayerStatus>('loading')
const errorMessage = ref('')
const playing = ref(false)
const isMuted = ref(props.autoplay)
const showControls = ref(true)
const statsVisible = ref(false)
const pipSupported =
  typeof document !== 'undefined' && 'requestPictureInPicture' in HTMLVideoElement.prototype

const stats = ref({ resolution: '—', bitrate: '—', buffer: '—', dropped: '—', latency: '—' })

let hls: Hls | null = null
let destroyed = false
let controlsTimer: ReturnType<typeof setTimeout> | null = null
// Auto-recovery only applies to transient failures; after this many fatal
// network/media errors the stream is assumed to be gone for good, so we stop
// retrying and surface the error state instead of looping forever.
const MAX_AUTO_RETRIES = 3
let retryCount = 0
// Native-HLS (Safari) handlers, kept so teardown can remove them — init() runs
// again on every source change / manual retry, so unremoved listeners would
// accumulate across restarts.
let nativeErrorHandler: (() => void) | null = null
let nativeLoadedHandler: (() => void) | null = null

const resetControlsTimer = () => {
  if (controlsTimer) clearTimeout(controlsTimer)
  controlsTimer = setTimeout(() => {
    showControls.value = false
  }, 3000)
}

const teardown = () => {
  if (hls) {
    hls.destroy()
    hls = null
  }
  const el = videoEl.value
  if (el) {
    if (nativeErrorHandler) el.removeEventListener('error', nativeErrorHandler)
    if (nativeLoadedHandler) el.removeEventListener('loadedmetadata', nativeLoadedHandler)
    nativeErrorHandler = null
    nativeLoadedHandler = null
    el.removeAttribute('src')
  }
}

const init = () => {
  if (destroyed) return
  teardown()
  // A fresh source gets a fresh retry budget.
  retryCount = 0
  const el = videoEl.value
  if (!el) return
  status.value = 'loading'
  errorMessage.value = ''
  stats.value = { resolution: '—', bitrate: '—', buffer: '—', dropped: '—', latency: '—' }

  const onError = (msg: string) => {
    if (destroyed) return
    status.value = 'error'
    errorMessage.value = msg
  }

  if (Hls.isSupported()) {
    hls = new Hls({ enableWorker: true, lowLatencyMode: false })
    hls.loadSource(props.src)
    hls.attachMedia(el)
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (destroyed) return
      if (!data.fatal) return
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
        case Hls.ErrorTypes.MEDIA_ERROR:
          if (retryCount >= MAX_AUTO_RETRIES) {
            onError(data.details || 'Playback failed')
            break
          }
          retryCount++
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad()
          else hls?.recoverMediaError()
          break
        default:
          onError(data.details || 'Playback failed')
      }
    })
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      if (destroyed) return
      status.value = 'ready'
      if (props.autoplay) el.play().catch(() => {})
    })
  } else if (el.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari — native HLS
    nativeErrorHandler = () => onError('Unable to load the stream')
    nativeLoadedHandler = () => {
      if (destroyed) return
      status.value = 'ready'
      if (props.autoplay) el.play().catch(() => {})
    }
    el.addEventListener('error', nativeErrorHandler)
    el.addEventListener('loadedmetadata', nativeLoadedHandler)
    el.src = props.src
  } else {
    onError('HLS playback is not supported in this browser')
  }
}

const togglePlay = () => {
  const el = videoEl.value
  if (!el) return
  if (el.paused) {
    el.play().catch(() => {})
  } else {
    el.pause()
  }
  showControls.value = true
  resetControlsTimer()
}

const toggleMute = () => {
  const el = videoEl.value
  if (!el) return
  el.muted = !el.muted
  isMuted.value = el.muted
}

const toggleFullscreen = () => {
  const el = videoEl.value
  if (!el) return
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    el.requestFullscreen()
  }
}

const togglePip = async () => {
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

// Poll stats while the stream is connected.
let statsTimer: ReturnType<typeof setInterval> | null = null
const updateStats = () => {
  const el = videoEl.value
  if (status.value !== 'ready' || !el) return
  if (el.videoWidth) stats.value.resolution = `${el.videoWidth}×${el.videoHeight}`
  if (hls) {
    const level = hls.levels[hls.currentLevel]
    if (level && level.width && level.height) {
      stats.value.resolution = `${level.width}×${level.height}`
    }
    if (hls.latency > 0) stats.value.latency = `${Math.round(hls.latency)} ms`
    if (hls.bandwidthEstimate > 0) {
      stats.value.bitrate = `${(hls.bandwidthEstimate / 1024 / 1024).toFixed(2)} Mbps`
    }
  }
  try {
    const quality = el.getVideoPlaybackQuality()
    stats.value.dropped = String(quality.droppedVideoFrames || 0)
  } catch {
    // Some embedders don't implement getVideoPlaybackQuality
  }
  if (el.buffered.length) {
    const end = el.buffered.end(el.buffered.length - 1)
    stats.value.buffer = `${Math.max(end - el.currentTime, 0).toFixed(1)}s`
  }
}

watch(
  () => props.src,
  () => init()
)

onMounted(() => {
  init()
  statsTimer = setInterval(updateStats, 1000)
  resetControlsTimer()
})

onBeforeUnmount(() => {
  destroyed = true
  teardown()
  if (controlsTimer) clearTimeout(controlsTimer)
  if (statsTimer) clearInterval(statsTimer)
})
</script>

<style scoped>
.hls-player {
  position: relative;
  width: 100%;
  background: #000;
  border-radius: var(--radius-md, 10px);
  overflow: hidden;
  aspect-ratio: 16 / 9;
  box-shadow: var(--shadow-sm);
}

.hls-player video {
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

.hls-player:hover .player-toolbar {
  opacity: 1;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.path-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  margin-left: 4px;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-btn {
  color: #fff !important;
}

.toolbar-btn:hover {
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
