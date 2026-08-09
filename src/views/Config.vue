<template>
  <div>
    <div class="page-header">
      <h1>
        System Config
        <el-tag v-if="isDirty" type="warning" size="small" round>Unsaved changes</el-tag>
      </h1>
      <div class="page-actions">
        <el-button :icon="Refresh" @click="refreshConfig">Refresh</el-button>
        <el-button type="primary" :disabled="!isDirty" @click="confirmSave">Save Config</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      Server-wide MediaMTX configuration. Changes apply immediately to the live server.
    </p>

    <el-card shadow="hover">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- General config -->
        <el-tab-pane label="General" name="general">
          <p class="tab-summary">
            Logging and low-level network timeouts that apply server-wide across all protocols.
          </p>
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Log Level">
              <el-select v-model="configStore.config.logLevel" style="width: 100%">
                <el-option label="DEBUG" value="debug" />
                <el-option label="INFO" value="info" />
                <el-option label="WARN" value="warn" />
                <el-option label="ERROR" value="error" />
              </el-select>
            </el-form-item>
            <el-form-item label="Log File">
              <el-input v-model="configStore.config.logFile" />
            </el-form-item>
            <el-form-item label="Read Timeout">
              <el-input v-model="configStore.config.readTimeout" />
            </el-form-item>
            <el-form-item label="Write Timeout">
              <el-input v-model="configStore.config.writeTimeout" />
            </el-form-item>
            <el-form-item label="Write Queue Size">
              <el-input-number
                v-model="configStore.config.writeQueueSize"
                :min="1"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="UDP Max Payload Size">
              <el-input-number
                v-model="configStore.config.udpMaxPayloadSize"
                :min="1"
                style="width: 100%"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Auth config -->
        <el-tab-pane label="Auth" name="auth">
          <p class="tab-summary">
            How MediaMTX authenticates publishers and readers: internal credentials, an external
            HTTP server, or JSON Web Tokens (JWT).
          </p>
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Auth Method">
              <el-select v-model="configStore.config.authMethod" style="width: 100%">
                <el-option label="Internal" value="internal" />
                <el-option label="HTTP" value="http" />
                <el-option label="JWT" value="jwt" />
              </el-select>
            </el-form-item>
            <el-form-item label="HTTP Auth Address">
              <el-input v-model="configStore.config.authHTTPAddress" />
            </el-form-item>
            <el-form-item label="JWT JWKS">
              <el-input v-model="configStore.config.authJWTJWKS" />
            </el-form-item>
            <el-form-item v-if="configStore.config.authMethod === 'jwt'" label=" ">
              <el-button :icon="Refresh" :loading="jwksRefreshing" @click="handleRefreshJwks">
                Refresh JWKS
              </el-button>
              <span class="form-hint">Re-fetches the JSON Web Key Set from the configured URL</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- RTSP config -->
        <el-tab-pane label="RTSP" name="rtsp">
          <p class="tab-summary">
            RTSP/RTSPS listener settings and whether transport encryption is offered or enforced.
          </p>
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Enable RTSP">
              <el-switch v-model="configStore.config.rtsp" />
            </el-form-item>
            <el-form-item label="RTSP Address">
              <el-input v-model="configStore.config.rtspAddress" />
            </el-form-item>
            <el-form-item label="RTSPS Address">
              <el-input v-model="configStore.config.rtspsAddress" />
            </el-form-item>
            <el-form-item label="RTSP Encryption">
              <el-select v-model="configStore.config.rtspEncryption" style="width: 100%">
                <el-option label="None" value="no" />
                <el-option label="Optional" value="optional" />
                <el-option label="Required" value="strict" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- RTMP config -->
        <el-tab-pane label="RTMP" name="rtmp">
          <p class="tab-summary">
            RTMP/RTMPS listener settings and whether transport encryption is offered or enforced.
          </p>
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Enable RTMP">
              <el-switch v-model="configStore.config.rtmp" />
            </el-form-item>
            <el-form-item label="RTMP Address">
              <el-input v-model="configStore.config.rtmpAddress" />
            </el-form-item>
            <el-form-item label="RTMP Encryption">
              <el-select v-model="configStore.config.rtmpEncryption" style="width: 100%">
                <el-option label="None" value="no" />
                <el-option label="Optional" value="optional" />
                <el-option label="Required" value="strict" />
              </el-select>
            </el-form-item>
            <el-form-item label="RTMPS Address">
              <el-input v-model="configStore.config.rtmpsAddress" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- HLS config -->
        <el-tab-pane label="HLS" name="hls">
          <p class="tab-summary">
            HTTP Live Streaming listener, output variant (MPEG-TS, fMP4, or Low Latency), and how
            the stream is split into segments.
          </p>
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Enable HLS">
              <el-switch v-model="configStore.config.hls" />
            </el-form-item>
            <el-form-item label="HLS Address">
              <el-input v-model="configStore.config.hlsAddress" />
            </el-form-item>
            <el-form-item label="HLS Variant">
              <el-select v-model="configStore.config.hlsVariant" style="width: 100%">
                <el-option label="MPEGTS" value="mpegts" />
                <el-option label="FMP4" value="fmp4" />
                <el-option label="Low Latency" value="lowLatency" />
              </el-select>
            </el-form-item>
            <el-form-item label="Segment Count">
              <el-input-number
                v-model="configStore.config.hlsSegmentCount"
                :min="1"
                style="width: 100%"
              />
            </el-form-item>
            <el-form-item label="Segment Duration">
              <el-input v-model="configStore.config.hlsSegmentDuration" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- WebRTC config -->
        <el-tab-pane label="WebRTC" name="webrtc">
          <p class="tab-summary">
            WebRTC (WHEP/WHIP) listener plus STUN/TURN servers and NAT traversal settings for
            browser-based viewers.
          </p>
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Enable WebRTC">
              <el-switch v-model="configStore.config.webrtc" />
            </el-form-item>
            <el-form-item label="WebRTC Address">
              <el-input v-model="configStore.config.webrtcAddress" />
            </el-form-item>
            <el-form-item label="ICE Servers">
              <el-input
                v-model="iceServersText"
                type="textarea"
                :rows="3"
                placeholder="stun:stun.l.google.com:19302"
              />
              <span class="form-hint"
                >One server per line, e.g. stun:stun.example.com:3478 or
                turn:turn.example.com:3478</span
              >
            </el-form-item>
            <el-form-item label="Host NAT 1:1 IPs">
              <el-input
                v-model="configStore.config.webrtcICEHostNAT1To1IPs"
                placeholder="e.g. 203.0.113.10"
              />
              <span class="form-hint">Public IP to advertise to remote peers when behind NAT</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- SRT config -->
        <el-tab-pane label="SRT" name="srt">
          <p class="tab-summary">
            SRT listener for secure, low-latency transport — commonly used to carry streams between
            servers.
          </p>
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Enable SRT">
              <el-switch v-model="configStore.config.srt" />
            </el-form-item>
            <el-form-item label="SRT Address">
              <el-input v-model="configStore.config.srtAddress" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- API config -->
        <el-tab-pane label="API" name="api">
          <p class="tab-summary">
            REST API listener that this dashboard uses to read and modify the server, plus optional
            HTTPS.
          </p>
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Enable API">
              <el-switch v-model="configStore.config.api" />
            </el-form-item>
            <el-form-item label="API Address">
              <el-input v-model="configStore.config.apiAddress" />
            </el-form-item>
            <el-form-item label="API Encryption">
              <el-switch v-model="configStore.config.apiEncryption" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Recording config -->
        <el-tab-pane label="Recording" name="record">
          <p class="tab-summary">
            Server-wide recording defaults. Individual paths can override these in Path Config.
          </p>
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Enable Recording">
              <el-switch v-model="configStore.config.record" />
            </el-form-item>
            <el-form-item label="Recording Path">
              <el-input v-model="configStore.config.recordPath" />
            </el-form-item>
            <el-form-item label="Recording Format">
              <el-select v-model="configStore.config.recordFormat" style="width: 100%">
                <el-option label="FMP4" value="fmp4" />
                <el-option label="MPEGTS" value="mpegts" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Playback config -->
        <el-tab-pane label="Playback" name="playback">
          <p class="tab-summary">
            Built-in playback server that serves recordings over HLS/WebRTC, and how it
            authenticates requests.
          </p>
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Enable Playback">
              <el-switch v-model="configStore.config.playback" />
            </el-form-item>
            <el-form-item label="Playback Address">
              <el-input v-model="configStore.config.playbackAddress" />
            </el-form-item>
            <el-form-item label="Playback Auth">
              <el-select v-model="configStore.config.playbackAuth" style="width: 100%">
                <el-option label="None" value="no" />
                <el-option label="Internal" value="internal" />
                <el-option label="HTTP" value="http" />
                <el-option label="JWT" value="jwt" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import { useActivityStore } from '@/stores/activity'
import { refreshJwks } from '@/api/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getErrorMessage } from '@/composables/useErrorMessage'

const configStore = useConfigStore()
const activityStore = useActivityStore()
const activeTab = ref('general')
const jwksRefreshing = ref(false)

// webrtcICEServers is an array in the API config; the form edits it as a
// newline-separated list.
const iceServersText = computed({
  get: () =>
    Array.isArray(configStore.config.webrtcICEServers)
      ? configStore.config.webrtcICEServers.join('\n')
      : '',
  set: (value: string) => {
    configStore.config.webrtcICEServers = value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  }
})

// Tracks whether the loaded config has been edited since the last successful
// fetch/save, so we can warn before applying or discarding changes.
const isDirty = ref(false)
let lastSavedSnapshot = '{}'

const snapshot = () => JSON.stringify(configStore.config)
const markClean = () => {
  lastSavedSnapshot = snapshot()
  isDirty.value = false
}

watch(
  () => configStore.config,
  () => {
    isDirty.value = snapshot() !== lastSavedSnapshot
  },
  { deep: true }
)

const refreshConfig = async () => {
  if (isDirty.value) {
    try {
      await ElMessageBox.confirm(
        'You have unsaved changes that will be lost. Discard them and reload from the server?',
        'Discard unsaved changes?',
        { confirmButtonText: 'Discard', cancelButtonText: 'Keep editing', type: 'warning' }
      )
    } catch {
      return // user chose to keep editing
    }
  }
  try {
    await configStore.fetchConfig()
    markClean()
    ElMessage.success('Config refreshed')
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Failed to refresh config'))
  }
}

const confirmSave = async () => {
  try {
    await ElMessageBox.confirm(
      'This applies your changes to the live MediaMTX server configuration immediately.',
      'Apply config changes?',
      { confirmButtonText: 'Apply', cancelButtonText: 'Cancel', type: 'warning' }
    )
  } catch {
    return // cancelled
  }
  await saveConfig()
}

const saveConfig = async () => {
  // MediaMTX rejects some empty-string fields outright (same as path config),
  // so omit blanks rather than sending them verbatim.
  const data: Record<string, any> = {}
  for (const [key, value] of Object.entries(configStore.config)) {
    if (value === '' || value === null || value === undefined) continue
    data[key] = value
  }
  try {
    await configStore.saveConfig(data)
    markClean()
    ElMessage.success('Config saved')
    activityStore.log('Applied system config changes', 'success')
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Failed to save config'))
  }
}

const handleRefreshJwks = async () => {
  jwksRefreshing.value = true
  try {
    await refreshJwks()
    ElMessage.success('JWKS refreshed')
    activityStore.log('Refreshed JWT JWKS', 'success')
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Failed to refresh JWKS'))
  } finally {
    jwksRefreshing.value = false
  }
}

const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onBeforeRouteLeave(() => {
  if (!isDirty.value) return true
  return window.confirm('You have unsaved config changes. Leave without saving?')
})

onMounted(() => {
  refreshConfig()
  window.addEventListener('beforeunload', beforeUnloadHandler)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})
</script>

<style scoped>
:deep(.el-tabs__content) {
  padding: 20px;
}

.tab-summary {
  margin: 0 0 16px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  max-width: 680px;
}

.page-header h1 {
  gap: 10px;
}
</style>
