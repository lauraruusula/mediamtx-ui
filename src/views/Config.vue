<template>
  <div>
    <div class="page-header">
      <h1>System Config</h1>
      <div class="page-actions">
        <el-button :icon="Refresh" @click="refreshConfig">Refresh</el-button>
        <el-button type="primary" @click="saveConfig">Save Config</el-button>
      </div>
    </div>

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
              <el-input-number v-model="configStore.config.writeQueueSize" :min="1" style="width: 100%" />
            </el-form-item>
            <el-form-item label="UDP Max Payload Size">
              <el-input-number v-model="configStore.config.udpMaxPayloadSize" :min="1" style="width: 100%" />
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
              <el-input-number v-model="configStore.config.hlsSegmentCount" :min="1" style="width: 100%" />
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
import { ref, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const configStore = useConfigStore()
const activeTab = ref('general')

const refreshConfig = async () => {
  try {
    await configStore.fetchConfig()
    ElMessage.success('Config refreshed')
  } catch {
    ElMessage.error('Failed to refresh config')
  }
}

const saveConfig = async () => {
  try {
    await configStore.saveConfig(configStore.config)
    ElMessage.success('Config saved')
  } catch {
    ElMessage.error('Failed to save config')
  }
}

onMounted(refreshConfig)
</script>

<style scoped>
:deep(.el-tabs__content) {
  padding: 20px;
}
</style>
