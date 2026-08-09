<template>
  <div class="stream-player">
    <video ref="videoEl" autoplay playsinline muted @click="toggleControls" />

    <!-- Overlay: connecting / error -->
    <div v-if="player.state.value !== 'connected'" class="player-overlay">
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

    <!-- Bottom toolbar -->
    <div
      class="player-toolbar"
      :class="{ visible: showControls || player.state.value !== 'connected' }"
    >
      <div class="toolbar-left">
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
          :disabled="isMuted"
          aria-label="Volume"
          @input="setVolume"
        />
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
  Mute,
  Microphone,
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
const configStore = useConfigStore()
const whepPort = ref(8889)
let controlsTimer: ReturnType<typeof setTimeout> | null = null

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
  player.connect(getWhepUrl())
}

function retry() {
  startPlayer()
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
    // Dragging the slider back up also unmutes.
    if (value > 0 && videoEl.value.muted) {
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

function toggleControls() {
  showControls.value = !showControls.value
  resetControlsTimer()
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

onMounted(() => {
  configReady.then(() => startPlayer())
})

onBeforeUnmount(() => {
  player.disconnect()
  if (controlsTimer) clearTimeout(controlsTimer)
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
</style>
