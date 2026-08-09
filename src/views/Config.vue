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
          <el-form :model="configStore.config" label-width="180px">
            <el-form-item label="Enable WebRTC">
              <el-switch v-model="configStore.config.webrtc" />
            </el-form-item>
            <el-form-item label="WebRTC Address">
              <el-input v-model="configStore.config.webrtcAddress" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- SRT config -->
        <el-tab-pane label="SRT" name="srt">
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
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
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
  try {
    await configStore.saveConfig(configStore.config)
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

.page-header h1 {
  gap: 10px;
}
</style>
