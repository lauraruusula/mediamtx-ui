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
let controlsTimer: ReturnType<typeof setTimeout> | null = null

function getWhepUrl() {
  // Encode each path segment individually so names with special characters
  // (spaces, '?', '#', etc.) can't alter the URL's structure, while still
  // allowing legitimate hierarchical path names ("cam/1") to keep their slashes.
  const encodedPath = props.pathName.split('/').map(encodeURIComponent).join('/')
  if (props.whepBaseUrl) return `${props.whepBaseUrl}/${encodedPath}/whep`
  // Use direct connection to MediaMTX WebRTC server (same host, port 8889)
  // Vite proxy interferes with WHEP protocol headers, so we connect directly
  return `${window.location.protocol}//${window.location.hostname}:8889/${encodedPath}/whep`
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
    startPlayer()
  }
)

onMounted(startPlayer)

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
</style>
