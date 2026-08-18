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

    <el-card shadow="never" class="config-card">
      <el-tabs v-model="activeTab" :tab-position="tabPosition" class="config-tabs">
        <!-- General config -->
        <el-tab-pane lazy name="general">
          <template #label>
            <span class="tab-label"
              ><el-icon><Setting /></el-icon>General</span
            >
          </template>
          <div class="tab-heading">
            <h2>General</h2>
            <p>
              Logging and low-level network timeouts that apply server-wide across all protocols.
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
            <el-form-item label="Log Level">
              <el-select v-model="configStore.config.logLevel" style="width: 100%">
                <el-option label="DEBUG" value="debug" />
                <el-option label="INFO" value="info" />
                <el-option label="WARN" value="warn" />
                <el-option label="ERROR" value="error" />
              </el-select>
            </el-form-item>
            <el-form-item label="Log Destinations">
              <el-select
                v-model="logDestinations"
                multiple
                collapse-tags
                style="width: 100%"
                placeholder="Where logs are written"
              >
                <el-option label="stdout" value="stdout" />
                <el-option label="file" value="file" />
                <el-option label="syslog" value="syslog" />
              </el-select>
            </el-form-item>
            <el-form-item label="Structured Logging">
              <el-switch v-model="configStore.config.logStructured" />
              <span class="form-hint">Emit logs as structured JSON instead of plain text</span>
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
            <el-form-item label="Run on Connect">
              <el-input v-model="configStore.config.runOnConnect" />
              <span class="form-hint">Shell command run when any client connects</span>
            </el-form-item>
            <el-form-item label="Restart on Connect Hook Exit">
              <el-switch v-model="configStore.config.runOnConnectRestart" />
            </el-form-item>
            <el-form-item label="Run on Disconnect">
              <el-input v-model="configStore.config.runOnDisconnect" />
              <span class="form-hint">Shell command run when any client disconnects</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Metrics config -->
        <el-tab-pane lazy name="metrics">
          <template #label>
            <span class="tab-label"
              ><el-icon><Odometer /></el-icon>Metrics</span
            >
          </template>
          <div class="tab-heading">
            <h2>Metrics</h2>
            <p>
              Prometheus metrics endpoint for scraping stream and server telemetry, plus optional
              TLS.
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
            <el-form-item label="Enable Metrics">
              <el-switch v-model="configStore.config.metrics" />
            </el-form-item>
            <el-form-item label="Metrics Address">
              <el-input v-model="configStore.config.metricsAddress" />
            </el-form-item>
            <el-form-item label="Metrics Encryption">
              <el-switch v-model="configStore.config.metricsEncryption" />
              <span class="form-hint">Serve the metrics endpoint over HTTPS</span>
            </el-form-item>
            <el-form-item label="Metrics Allow Origins">
              <el-input v-model="metricsAllowOriginsText" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Auth config -->
        <el-tab-pane lazy name="auth">
          <template #label>
            <span class="tab-label"
              ><el-icon><Lock /></el-icon>Auth</span
            >
          </template>
          <div class="tab-heading">
            <h2>Auth</h2>
            <p>
              How MediaMTX authenticates publishers and readers: internal credentials, an external
              HTTP server, or JSON Web Tokens (JWT).
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
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
        <el-tab-pane lazy name="rtsp">
          <template #label>
            <span class="tab-label"
              ><el-icon><Monitor /></el-icon>RTSP</span
            >
          </template>
          <div class="tab-heading">
            <h2>RTSP</h2>
            <p>
              RTSP/RTSPS listener settings and whether transport encryption is offered or enforced.
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
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
            <el-form-item label="Transports">
              <el-select
                v-model="rtspTransports"
                multiple
                collapse-tags
                style="width: 100%"
                placeholder="RTSP transports to accept"
              >
                <el-option label="UDP" value="udp" />
                <el-option label="Multicast" value="multicast" />
                <el-option label="TCP" value="tcp" />
              </el-select>
            </el-form-item>
            <el-form-item label="Auth Methods">
              <el-select
                v-model="rtspAuthMethods"
                multiple
                collapse-tags
                style="width: 100%"
                placeholder="RTSP authentication methods"
              >
                <el-option label="Basic" value="basic" />
                <el-option label="Digest" value="digest" />
              </el-select>
            </el-form-item>
            <el-form-item label="RTP Address">
              <el-input v-model="configStore.config.rtpAddress" />
            </el-form-item>
            <el-form-item label="RTCP Address">
              <el-input v-model="configStore.config.rtcpAddress" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- RTMP config -->
        <el-tab-pane lazy name="rtmp">
          <template #label>
            <span class="tab-label"
              ><el-icon><Film /></el-icon>RTMP</span
            >
          </template>
          <div class="tab-heading">
            <h2>RTMP</h2>
            <p>
              RTMP/RTMPS listener settings and whether transport encryption is offered or enforced.
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
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
        <el-tab-pane lazy name="hls">
          <template #label>
            <span class="tab-label"
              ><el-icon><Files /></el-icon>HLS</span
            >
          </template>
          <div class="tab-heading">
            <h2>HLS</h2>
            <p>
              HTTP Live Streaming listener, output variant (MPEG-TS, fMP4, or Low Latency), and how
              the stream is split into segments.
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
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
            <el-form-item label="Encryption">
              <el-select v-model="configStore.config.hlsEncryption" style="width: 100%">
                <el-option label="None" value="no" />
                <el-option label="Optional" value="optional" />
                <el-option label="Required" value="strict" />
              </el-select>
            </el-form-item>
            <el-form-item label="Always Remux">
              <el-switch v-model="configStore.config.hlsAlwaysRemux" />
              <span class="form-hint">Generate HLS even when no viewer is connected</span>
            </el-form-item>
            <el-form-item label="Allow Origins">
              <el-input
                v-model="hlsAllowOriginsText"
                placeholder="Comma-separated origins, e.g. https://app.example.com"
              />
            </el-form-item>
            <el-form-item label="Directory">
              <el-input v-model="configStore.config.hlsDirectory" />
              <span class="form-hint">Where to save HLS segments to disk (empty to disable)</span>
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
            <el-form-item label="Part Duration">
              <el-input v-model="configStore.config.hlsPartDuration" />
              <span class="form-hint">Duration of Low-Latency HLS parts</span>
            </el-form-item>
            <el-form-item label="Segment Max Size">
              <el-input v-model="configStore.config.hlsSegmentMaxSize" />
            </el-form-item>
            <el-form-item label="Close Muxer After">
              <el-input v-model="configStore.config.hlsMuxerCloseAfter" />
              <span class="form-hint">Close muxers after inactivity</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- WebRTC config -->
        <el-tab-pane lazy name="webrtc">
          <template #label>
            <span class="tab-label"
              ><el-icon><VideoCamera /></el-icon>WebRTC</span
            >
          </template>
          <div class="tab-heading">
            <h2>WebRTC</h2>
            <p>
              WebRTC (WHEP/WHIP) listener plus STUN/TURN servers and NAT traversal settings for
              browser-based viewers.
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
            <el-form-item label="Enable WebRTC">
              <el-switch v-model="configStore.config.webrtc" />
            </el-form-item>
            <el-form-item label="WebRTC Address">
              <el-input v-model="configStore.config.webrtcAddress" />
            </el-form-item>
            <el-form-item label="Encryption">
              <el-select v-model="configStore.config.webrtcEncryption" style="width: 100%">
                <el-option label="None" value="no" />
                <el-option label="Optional" value="optional" />
                <el-option label="Required" value="strict" />
              </el-select>
            </el-form-item>
            <el-form-item label="Additional Hosts">
              <el-input v-model="webrtcAdditionalHostsText" placeholder="Comma-separated hosts" />
              <span class="form-hint"
                >Extra hosts/IPs advertised to remote peers (e.g. public IP)</span
              >
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
            <el-form-item label="IPs from Interfaces">
              <el-switch v-model="configStore.config.webrtcIPsFromInterfaces" />
              <span class="form-hint"
                >Automatically detect advertised IPs from network interfaces</span
              >
            </el-form-item>
            <el-form-item label="STUN Gather Timeout">
              <el-input v-model="configStore.config.webrtcSTUNGatherTimeout" />
            </el-form-item>
            <el-form-item label="Handshake Timeout">
              <el-input v-model="configStore.config.webrtcHandshakeTimeout" />
            </el-form-item>
            <el-form-item label="Track Gather Timeout">
              <el-input v-model="configStore.config.webrtcTrackGatherTimeout" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- SRT config -->
        <el-tab-pane lazy name="srt">
          <template #label>
            <span class="tab-label"
              ><el-icon><Promotion /></el-icon>SRT</span
            >
          </template>
          <div class="tab-heading">
            <h2>SRT</h2>
            <p>
              SRT listener for secure, low-latency transport — commonly used to carry streams
              between servers.
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
            <el-form-item label="Enable SRT">
              <el-switch v-model="configStore.config.srt" />
            </el-form-item>
            <el-form-item label="SRT Address">
              <el-input v-model="configStore.config.srtAddress" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- API config -->
        <el-tab-pane lazy name="api">
          <template #label>
            <span class="tab-label"
              ><el-icon><Link /></el-icon>API</span
            >
          </template>
          <div class="tab-heading">
            <h2>API</h2>
            <p>
              REST API listener that this dashboard uses to read and modify the server, plus
              optional HTTPS.
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
            <el-form-item label="Enable API">
              <el-switch v-model="configStore.config.api" />
            </el-form-item>
            <el-form-item label="API Address">
              <el-input v-model="configStore.config.apiAddress" />
            </el-form-item>
            <el-form-item label="API Encryption">
              <el-switch v-model="configStore.config.apiEncryption" />
            </el-form-item>
            <el-form-item label="Allow Origins">
              <el-input v-model="apiAllowOriginsText" placeholder="Comma-separated origins" />
              <span class="form-hint">CORS origins allowed to call the API</span>
            </el-form-item>
            <el-form-item label="Trusted Proxies">
              <el-input v-model="apiTrustedProxiesText" placeholder="Comma-separated IPs/CIDRs" />
              <span class="form-hint">Proxies whose X-Forwarded-For header is trusted</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- Recording config -->
        <el-tab-pane lazy name="record">
          <template #label>
            <span class="tab-label"
              ><el-icon><FolderOpened /></el-icon>Recording</span
            >
          </template>
          <div class="tab-heading">
            <h2>Recording</h2>
            <p>
              Server-wide recording defaults. Individual paths can override these in Path Config.
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
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
        <el-tab-pane lazy name="playback">
          <template #label>
            <span class="tab-label"
              ><el-icon><VideoPlay /></el-icon>Playback</span
            >
          </template>
          <div class="tab-heading">
            <h2>Playback</h2>
            <p>
              Built-in playback server that serves recordings over HLS/WebRTC, and how it
              authenticates requests.
            </p>
          </div>
          <el-form :model="configStore.config" :label-width="formLabelWidth" class="config-form">
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

        <!-- Path defaults config -->
        <el-tab-pane lazy name="pathdefaults">
          <template #label>
            <span class="tab-label"
              ><el-icon><Operation /></el-icon>Path Defaults</span
            >
          </template>
          <div class="tab-heading">
            <h2>Path Defaults</h2>
            <p>
              Default configuration applied to every path. Individual paths can override these
              settings in Path Config.
            </p>
          </div>
          <PathDefaultsPanel />
        </el-tab-pane>

        <!-- Raw JSON config -->
        <el-tab-pane lazy name="json">
          <template #label>
            <span class="tab-label"
              ><el-icon><Document /></el-icon>Raw JSON</span
            >
          </template>
          <div class="tab-heading">
            <h2>Raw JSON</h2>
            <p>
              Edit the full config as JSON. Useful for fields the form does not expose. Click Apply
              to load your edits into the form, then Save Config to send them to the server.
            </p>
          </div>
          <div class="json-editor">
            <el-input
              v-model="jsonText"
              type="textarea"
              :rows="20"
              class="json-textarea"
              spellcheck="false"
              placeholder="Loading config…"
            />
            <div class="json-actions">
              <el-button :icon="MagicStick" @click="formatJson">Format</el-button>
              <el-button type="primary" :icon="Check" :disabled="!jsonValid" @click="applyJson">
                Apply to Form
              </el-button>
              <el-alert
                v-if="jsonError"
                :title="jsonError"
                type="error"
                show-icon
                :closable="false"
              />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import { useActivityStore } from '@/stores/activity'
import { refreshJwks } from '@/api/auth'
import { ElMessageBox } from 'element-plus'
import {
  Refresh,
  Setting,
  Lock,
  Monitor,
  Film,
  Files,
  VideoCamera,
  Promotion,
  Link,
  FolderOpened,
  VideoPlay,
  Odometer,
  Operation,
  Document,
  MagicStick,
  Check
} from '@element-plus/icons-vue'
import { getErrorMessage } from '@/composables/useErrorMessage'
import { toast } from '@/composables/useToast'
import { isRedactedCredential } from '@/composables/usePathConfForm'
import PathDefaultsPanel from '@/components/PathDefaultsPanel.vue'

const configStore = useConfigStore()
const activityStore = useActivityStore()
const route = useRoute()
const activeTab = ref('general')
const jwksRefreshing = ref(false)

const validTabs = [
  'general',
  'metrics',
  'auth',
  'rtsp',
  'rtmp',
  'hls',
  'webrtc',
  'srt',
  'api',
  'record',
  'playback',
  'pathdefaults',
  'json'
]

// Tabs sit in a left rail on wide screens and move to a horizontal bar on
// narrow ones (where a 10-item vertical rail would push the form off-screen).
// The form label width shrinks along with it so fields keep a usable width.
const tabPosition = ref<'left' | 'top'>('left')
const formLabelWidth = ref('180px')

const checkTabPosition = () => {
  const narrow = window.innerWidth < 768
  tabPosition.value = narrow ? 'top' : 'left'
  formLabelWidth.value = narrow ? '120px' : '180px'
}

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

// Fields that are arrays in the API config but edited as comma-separated text
// in the form.
const commaList = (key: string) =>
  computed<string>({
    get: () => (Array.isArray(configStore.config[key]) ? configStore.config[key].join(', ') : ''),
    set: (value: string) => {
      configStore.config[key] = value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    }
  })

const arrayList = (key: string) =>
  computed<string[]>({
    get: () => (Array.isArray(configStore.config[key]) ? configStore.config[key] : []),
    set: (value: string[]) => {
      configStore.config[key] = value
    }
  })

const logDestinations = arrayList('logDestinations')
const rtspTransports = arrayList('rtspTransports')
const rtspAuthMethods = arrayList('rtspAuthMethods')
const hlsAllowOriginsText = commaList('hlsAllowOrigins')
const webrtcAdditionalHostsText = commaList('webrtcAdditionalHosts')
const apiAllowOriginsText = commaList('apiAllowOrigins')
const apiTrustedProxiesText = commaList('apiTrustedProxies')
const metricsAllowOriginsText = commaList('metricsAllowOrigins')

// Raw JSON editor: synced from the loaded config whenever the tab opens, and
// applied back onto the reactive config (which marks the form dirty).
const jsonText = ref('')
const jsonError = ref('')
const jsonValid = ref(true)

const syncJson = () => {
  jsonText.value = JSON.stringify(configStore.config, null, 2)
  jsonError.value = ''
  jsonValid.value = true
}

watch(activeTab, tab => {
  if (tab === 'json') syncJson()
})

const formatJson = () => {
  try {
    jsonText.value = JSON.stringify(JSON.parse(jsonText.value), null, 2)
    jsonError.value = ''
    jsonValid.value = true
  } catch {
    jsonError.value = 'Invalid JSON'
    jsonValid.value = false
  }
}

const applyJson = () => {
  try {
    const parsed = JSON.parse(jsonText.value)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      jsonError.value = 'Config must be a JSON object'
      jsonValid.value = false
      return
    }
    Object.assign(configStore.config, parsed)
    jsonError.value = ''
    jsonValid.value = true
    toast.success('JSON applied to form — Save Config to persist')
  } catch {
    jsonError.value = 'Invalid JSON'
    jsonValid.value = false
  }
}

// Keep the Apply button honest while typing — Format/Apply report the specific
// error, this just disables Apply the moment the text stops parsing.
watch(jsonText, () => {
  try {
    JSON.parse(jsonText.value)
    jsonError.value = ''
    jsonValid.value = true
  } catch {
    jsonValid.value = false
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
    toast.success('Config refreshed')
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to refresh config'))
  }
}

const confirmSave = async () => {
  try {
    await ElMessageBox.confirm(
      'This applies your changes to the live MediaMTX server configuration immediately.',
      'Save config changes?',
      { confirmButtonText: 'Save', cancelButtonText: 'Cancel', type: 'warning' }
    )
  } catch {
    return // cancelled
  }
  await saveConfig()
}

const saveConfig = async () => {
  // MediaMTX copies every PATCHed field verbatim, so an empty string is what
  // clears a field back to its default. Stripping blanks here made it
  // impossible to reset a field once set. Validation still guards the few
  // fields that can't be empty while their feature is enabled (e.g. an
  // address while the protocol is on) and surfaces a clear error.
  const data: Record<string, any> = {}
  for (const [key, value] of Object.entries(configStore.config)) {
    if (value === null || value === undefined) continue
    data[key] = value
  }
  // v1.20.1 redacts credentials in responses and the server copies every
  // PATCHed field verbatim, so re-sending "<redacted>" would replace real
  // internal-user passwords with that literal string. The form never edits
  // internal users, so drop the field entirely to leave them untouched.
  if (
    Array.isArray(data.authInternalUsers) &&
    data.authInternalUsers.some((u: any) => u && isRedactedCredential(u.pass))
  ) {
    delete data.authInternalUsers
  }
  try {
    await configStore.saveConfig(data)
    markClean()
    toast.success('Config saved')
    activityStore.log('Saved system config changes', 'success')
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to save config'))
  }
}

const handleRefreshJwks = async () => {
  jwksRefreshing.value = true
  try {
    await refreshJwks()
    toast.success('JWKS refreshed')
    activityStore.log('Refreshed JWT JWKS', 'success')
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to refresh JWKS'))
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
  // vue-router awaits the returned promise; resolve true to proceed, false to
  // stay. ElMessageBox rejects when dismissed, which maps to "stay".
  return ElMessageBox.confirm(
    'You have unsaved config changes. Leave without saving?',
    'Unsaved changes',
    { confirmButtonText: 'Leave', cancelButtonText: 'Keep editing', type: 'warning' }
  )
    .then(() => true)
    .catch(() => false)
})

// Allow deep-linking to a specific tab (e.g. /config?tab=rtmp from a
// ProtocolDisabled hint) and switching tabs via the URL.
watch(
  () => route.query.tab,
  tab => {
    if (typeof tab === 'string' && validTabs.includes(tab)) activeTab.value = tab
  }
)

onMounted(() => {
  checkTabPosition()
  if (typeof route.query.tab === 'string' && validTabs.includes(route.query.tab)) {
    activeTab.value = route.query.tab
  }
  refreshConfig()
  window.addEventListener('resize', checkTabPosition)
  window.addEventListener('beforeunload', beforeUnloadHandler)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkTabPosition)
  window.removeEventListener('beforeunload', beforeUnloadHandler)
})
</script>

<style scoped>
.config-card {
  overflow: hidden;
}

/* Left-rail settings layout for the config tabs (wide screens) */
/* `--el-tabs-header-height: auto` must only apply to the rail layout — if it
   leaks into the top-position (mobile) chrome, default tab items collapse to
   content height. */
.config-tabs.el-tabs--left {
  --el-tabs-header-height: auto;
}

/* Only apply the rail look when tabs actually sit on the left; when they
   collapse to a horizontal bar on narrow screens, fall back to EP's default
   top-position chrome. */
.config-tabs.el-tabs--left :deep(.el-tabs__header) {
  background: var(--el-fill-color-light);
  border-right: 1px solid var(--el-border-color-lighter);
  margin-right: 0;
  width: 220px;
  padding: 16px 12px;
  flex-shrink: 0;
}

.config-tabs.el-tabs--left :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.config-tabs.el-tabs--left :deep(.el-tabs__active-bar) {
  display: none;
}

.config-tabs.el-tabs--left :deep(.el-tabs__item) {
  height: auto;
  line-height: 1.3;
  padding: 10px 14px;
  margin-bottom: 4px;
  border-radius: var(--radius-md);
  color: var(--el-text-color-regular);
  font-weight: 500;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.config-tabs.el-tabs--left :deep(.el-tabs__item:hover) {
  background: var(--surface-hover);
  color: var(--el-text-color-primary);
}

.config-tabs.el-tabs--left :deep(.el-tabs__item.is-active) {
  background: var(--sidebar-active-bg);
  color: var(--el-color-primary);
  font-weight: 600;
}

.config-tabs :deep(.el-tabs__content) {
  overflow: hidden;
  padding: 28px 32px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tab-label .el-icon {
  font-size: 16px;
  flex-shrink: 0;
}

/* Section heading inside each tab pane */
.tab-heading {
  margin-bottom: 20px;
}

.tab-heading h2 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--el-text-color-primary);
}

.tab-heading p {
  margin: 0;
  max-width: 680px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

/* Constrain forms so inputs don't stretch the full panel width */
.config-form {
  max-width: 640px;
}

.json-editor {
  max-width: 900px;
}

.json-editor .json-textarea :deep(textarea) {
  font-family: var(--font-mono, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace);
  font-size: 12.5px;
  line-height: 1.6;
}

.json-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.json-actions .el-alert {
  flex: 1 1 100%;
  margin-top: 4px;
}

.page-header h1 {
  gap: 10px;
}

@media (max-width: 768px) {
  .config-tabs :deep(.el-tabs__content) {
    padding: 20px 16px;
  }

  /* Mobile horizontal tabs: keep items compact so the scrollable strip reads
     well; the icon sits inline with the label, EP's default 40px row height
     applies now that --el-tabs-header-height stays untouched here. */
  .config-tabs :deep(.el-tabs__item) {
    padding: 0 14px;
    font-size: 13px;
  }

  .config-form {
    max-width: 100%;
  }
}
</style>
