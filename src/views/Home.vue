<template>
  <div class="dashboard">
    <!-- Hero -->
    <div class="dash-hero">
      <div class="dash-hero-text">
        <h1>Dashboard</h1>
        <p>Live overview of paths, connections, and server health.</p>
      </div>
      <div class="dash-hero-actions">
        <span v-if="lastUpdated.label" class="updated-hint">{{ lastUpdated.label }}</span>
        <el-switch
          v-model="autoRefreshCtrl.active.value"
          :active-text="'Auto refresh'"
          @change="autoRefreshCtrl.toggle"
        />
        <el-select
          :model-value="autoRefreshCtrl.interval.value"
          class="interval-select"
          aria-label="Auto refresh interval"
          @change="autoRefreshCtrl.setIntervalMs"
        >
          <el-option
            v-for="ms in AUTO_REFRESH_INTERVAL_OPTIONS_MS"
            :key="ms"
            :label="`${ms / 1000}s`"
            :value="ms"
          />
        </el-select>
        <el-button
          :icon="Refresh"
          circle
          :loading="systemStore.loading"
          aria-label="Refresh"
          @click="handleRefresh"
        />
      </div>
    </div>

    <el-alert
      v-if="!systemStore.loading && !systemStore.connected"
      type="error"
      show-icon
      :closable="false"
      title="Can't reach the MediaMTX API"
      description="Check that MediaMTX is running and the API is reachable at /api, then hit refresh."
      class="dash-alert"
    />

    <!-- Server health strip -->
    <div class="health-strip" :class="{ offline: !systemStore.connected }">
      <div class="health-status">
        <span class="health-dot" :class="{ offline: !systemStore.connected }" />
        <div class="health-status-text">
          <span class="health-status-title">
            {{ systemStore.connected ? 'Connected' : 'Disconnected' }}
          </span>
          <span class="health-status-sub">
            {{
              systemStore.connected
                ? 'MediaMTX API is reachable'
                : 'Server unreachable — check that MediaMTX is running'
            }}
          </span>
        </div>
      </div>
      <div class="health-divider" />
      <div class="health-stat">
        <span class="health-stat-label">Version</span>
        <span class="health-stat-value">
          {{ systemStore.connected ? formatVersion(systemStore.info?.version) : '—' }}
        </span>
      </div>
      <div class="health-stat">
        <span class="health-stat-label">Uptime</span>
        <span class="health-stat-value">
          <UptimeText v-if="systemStore.connected" :started="systemStore.info?.started" />
          <template v-else>—</template>
        </span>
      </div>
      <div class="health-stat">
        <span class="health-stat-label">Paths Online</span>
        <span class="health-stat-value">
          {{ systemStore.onlinePaths.length
          }}<span class="health-stat-suffix"> / {{ systemStore.pathCount }}</span>
        </span>
      </div>
    </div>

    <!-- KPI cards -->
    <div class="kpi-grid">
      <div v-for="card in kpiCards" :key="card.label" class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-icon" :style="card.tint">
            <el-icon><component :is="card.icon" /></el-icon>
          </span>
          <span class="kpi-label">{{ card.label }}</span>
        </div>
        <div class="kpi-value">{{ card.value }}</div>
        <div class="kpi-context">
          <span
            v-if="card.contextDot"
            class="kpi-context-dot"
            :style="{ background: card.contextDot }"
          />
          {{ card.context }}
        </div>
      </div>
    </div>

    <!-- Bandwidth trend -->
    <el-card class="dash-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-icon tint-sky"
              ><el-icon><TrendCharts /></el-icon
            ></span>
            <span>Bandwidth Trend</span>
            <span class="panel-hint"
              >this session, updates every {{ autoRefreshCtrl.interval.value / 1000 }}s</span
            >
          </div>
          <div class="panel-stats">
            <div class="panel-stat">
              <span class="panel-stat-label">Current</span>
              <span class="panel-stat-value">{{ formatBytes(currentBandwidthRate) }}/s</span>
            </div>
            <div class="panel-stat">
              <span class="panel-stat-label">Peak</span>
              <span class="panel-stat-value">{{ formatBytes(peakBandwidthRate) }}/s</span>
            </div>
          </div>
        </div>
      </template>
      <v-chart
        v-if="bandwidthHistory.length > 1"
        :option="bandwidthTrendOption"
        style="height: 180px"
        autoresize
      />
      <div v-else class="bandwidth-placeholder">
        {{ bandwidthPlaceholderText }}
      </div>
    </el-card>

    <!-- Charts row -->
    <div class="charts-grid">
      <el-card class="dash-card" shadow="never">
        <template #header>
          <div class="panel-title">
            <span class="panel-icon tint-violet"
              ><el-icon><PieChart /></el-icon
            ></span>
            <span>Source Type Distribution</span>
          </div>
        </template>
        <v-chart :option="pieOption" style="height: 280px" autoresize />
      </el-card>

      <el-card class="dash-card" shadow="never">
        <template #header>
          <div class="panel-title">
            <span class="panel-icon tint-blue"
              ><el-icon><Histogram /></el-icon
            ></span>
            <span>Protocol Connections</span>
          </div>
        </template>
        <v-chart :option="barOption" style="height: 280px" autoresize />
      </el-card>
    </div>

    <!-- Active paths -->
    <el-card class="dash-card" shadow="never">
      <template #header>
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-icon tint-green"
              ><el-icon><Connection /></el-icon
            ></span>
            <span>Active Paths</span>
            <span v-if="systemStore.paths.length > 8" class="panel-hint">
              showing {{ Math.min(systemStore.paths.length, 8) }} of {{ systemStore.paths.length }}
            </span>
          </div>
          <div class="panel-actions">
            <el-button text type="primary" @click="$router.push('/paths')">View All</el-button>
            <el-button
              :icon="Refresh"
              circle
              size="small"
              :loading="systemStore.loading"
              aria-label="Refresh"
              @click="handleRefresh"
            />
          </div>
        </div>
      </template>

      <el-table
        v-loading="systemStore.loading && initialLoading"
        :data="systemStore.paths.slice(0, 8)"
        style="width: 100%"
      >
        <el-table-column label="Path" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <router-link
              class="cell-link path-link"
              :to="{ path: '/paths', query: { q: row.name } }"
            >
              {{ row.name }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column label="Status" width="100">
          <template #default="{ row }">
            <el-tag :type="row.online ? 'success' : 'info'" size="small">
              <span v-if="row.online" class="tag-live-dot" />{{ row.online ? 'Online' : 'Offline' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Source" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="source-cell">{{
              row.source ? formatSourceType(row.source.type) : '—'
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Readers" width="90" align="center">
          <template #default="{ row }">{{ row.readers?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="Inbound" width="120">
          <template #default="{ row }">{{ formatBytes(row.inboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column label="Outbound" width="120">
          <template #default="{ row }">{{ formatBytes(row.outboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="100" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-tooltip :content="row.online ? 'Play' : 'Path is offline'" placement="top">
                <el-button
                  :icon="VideoPlay"
                  circle
                  size="small"
                  type="success"
                  plain
                  :disabled="!row.online"
                  aria-label="Play"
                  @click="openPlayer(row as APIPath)"
                />
              </el-tooltip>
              <CopyLinkButton :path-name="row.name" />
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!systemStore.loading && systemStore.paths.length === 0"
        description="No paths yet — configure one under Path Config"
      />
    </el-card>

    <!-- Player Dialog -->
    <el-dialog
      v-model="playerVisible"
      :title="`Play - ${playingPath}`"
      width="720px"
      destroy-on-close
      align-center
    >
      <StreamPlayer v-if="playerVisible" :path-name="playingPath" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  defineAsyncComponent,
  type Component
} from 'vue'
import { useSystemStore } from '@/stores/system'
import { useThemeStore } from '@/stores/theme'
import {
  useAutoRefresh,
  AUTO_REFRESH_INTERVAL_MS,
  AUTO_REFRESH_INTERVAL_OPTIONS_MS
} from '@/composables/useAutoRefresh'
import { useLastUpdated } from '@/composables/useLastUpdated'
import { formatBytes, formatSourceType, formatVersion } from '@/composables/useFormatters'
import {
  Refresh,
  Connection,
  VideoPlay,
  UserFilled,
  DataLine,
  Odometer,
  TrendCharts,
  PieChart,
  Histogram
} from '@element-plus/icons-vue'
import StreamPlayer from '@/components/StreamPlayer.vue'
import CopyLinkButton from '@/components/CopyLinkButton.vue'
import UptimeText from '@/components/UptimeText.vue'
import { useCountUp } from '@/composables/useCountUp'
import type { APIPath } from '@/types/api'

// ECharts is only used on this page, so it's bundled as a separate chunk that
// starts loading when the dashboard first renders instead of on app boot.
const VChart = defineAsyncComponent(() => import('@/echarts').then(m => m.VChart))

// The trend chart keeps up to this many samples; the window length depends on
// the chosen refresh interval (5m at 5s, 30m at 30s).
const MAX_SAMPLES = 60
// Protocol-count KPIs don't need the fast poll cadence — they refresh on a
// slower timer than the path tick so the dashboard doesn't fan out 8 requests
// (info + paths + 6 count probes) every interval.
const PROTOCOL_COUNTS_INTERVAL_MS = 15000
const systemStore = useSystemStore()
const themeStore = useThemeStore()
const lastUpdated = useLastUpdated()
const playerVisible = ref(false)
const playingPath = ref('')

// The loading mask is only meaningful while the panel has nothing to render —
// showing it on every auto-refresh tick makes the table flash white each 5s.
// Once the first fetch has landed, refreshes update the table in place and the
// refresh button's own spinner covers the loading state.
const initialLoading = ref(true)

// Purely cosmetic: animate the integer stat tiles counting up on load/refresh.
// Uptime and Bandwidth are formatted strings, not raw integers, so they're
// left as direct display values.
const totalPathsDisplay = useCountUp(() => systemStore.pathCount)
const readersDisplay = useCountUp(() => systemStore.totalReaders)

// MediaMTX's API is a snapshot with no history, so the bandwidth trend chart
// keeps its own small client-side rolling buffer, sampled on every refresh.
interface BandwidthSample {
  time: number
  bytes: number
}
const bandwidthHistory = ref<BandwidthSample[]>([])

// The placeholder tells the user why the chart is empty and what to do next —
// the guidance differs depending on whether polling is already on.
const bandwidthPlaceholderText = computed(() =>
  autoRefreshCtrl.active.value
    ? 'Waiting for more samples — keep this page open to build the bandwidth trend.'
    : 'Collecting samples — turn on auto refresh to watch bandwidth over time.'
)

const recordBandwidthSample = () => {
  bandwidthHistory.value.push({
    time: Date.now(),
    bytes: systemStore.totalInboundBytes + systemStore.totalOutboundBytes
  })
  if (bandwidthHistory.value.length > MAX_SAMPLES) bandwidthHistory.value.shift()
}

// ECharts renders to <canvas>, which can't resolve CSS custom properties like
// var(--el-text-color-secondary) — so chart colors are tracked as literal
// values keyed off the active theme instead.
const isDark = computed(() => themeStore.currentTheme === 'dark')
const chartTextSecondary = computed(() => (isDark.value ? '#98a2b3' : '#667085'))
const chartTextRegular = computed(() => (isDark.value ? '#d0d5dd' : '#344054'))
const chartSurfaceBg = computed(() => (isDark.value ? '#12151d' : '#ffffff'))
const chartAxisLine = computed(() => (isDark.value ? '#262b38' : '#dde1e8'))
const chartSplitLine = computed(() => (isDark.value ? '#1b1f2a' : '#edeff3'))

const openPlayer = (row: APIPath) => {
  playingPath.value = row.name
  playerVisible.value = true
}

// Theme-aware icon palette for the KPI tiles — literal values because inline
// styles (used for the tinted icon chips) can't read CSS custom properties.
const PALETTES = {
  light: { blue: '#4a63ee', violet: '#8b5cf6', sky: '#0ea5e9', green: '#12b76a' },
  dark: { blue: '#6b84ff', violet: '#a78bfa', sky: '#38bdf8', green: '#32d583' }
}

const iconTint = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return {
    background: `rgba(${r}, ${g}, ${b}, ${isDark.value ? 0.18 : 0.1})`,
    color: hex
  }
}

interface KpiCard {
  icon: Component
  label: string
  value: string | number
  context: string
  contextDot?: string
  tint: { background: string; color: string }
}

const kpiCards = computed<KpiCard[]>(() => {
  const palette = isDark.value ? PALETTES.dark : PALETTES.light
  const online = systemStore.onlinePaths.length
  return [
    {
      icon: Connection,
      label: 'Total Paths',
      value: totalPathsDisplay.value,
      context: `${online} online now`,
      contextDot: online > 0 ? palette.green : undefined,
      tint: iconTint(palette.blue)
    },
    {
      icon: UserFilled,
      label: 'Active Readers',
      value: readersDisplay.value,
      context: `across ${online} online paths`,
      tint: iconTint(palette.violet)
    },
    {
      icon: DataLine,
      label: 'Total Traffic',
      value: formatBytes(systemStore.totalInboundBytes + systemStore.totalOutboundBytes),
      context: 'cumulative inbound + outbound',
      tint: iconTint(palette.sky)
    },
    {
      icon: Odometer,
      label: 'Live Bandwidth',
      value: `${formatBytes(currentBandwidthRate.value)}/s`,
      context: `peak ${formatBytes(peakBandwidthRate.value)}/s`,
      tint: iconTint(palette.green)
    }
  ]
})

// Per-second bandwidth rates between consecutive samples, shared by the chart
// and the Current/Peak pills in the panel header.
interface BandwidthRate {
  time: number
  rate: number
}
const bandwidthRates = computed<BandwidthRate[]>(() => {
  const samples = bandwidthHistory.value
  const rates: BandwidthRate[] = []
  for (let i = 1; i < samples.length; i++) {
    const dt = (samples[i].time - samples[i - 1].time) / 1000
    const db = samples[i].bytes - samples[i - 1].bytes
    rates.push({ time: samples[i].time, rate: dt > 0 ? Math.max(db / dt, 0) : 0 })
  }
  return rates
})

const currentBandwidthRate = computed(() => {
  const rates = bandwidthRates.value
  return rates.length ? rates[rates.length - 1].rate : 0
})

const peakBandwidthRate = computed(() => {
  const rates = bandwidthRates.value
  return rates.length ? Math.max(...rates.map(r => r.rate)) : 0
})

const pieOption = computed(() => {
  const dist = systemStore.sourceTypeDistribution
  const data = Object.entries(dist).map(([name, value]) => ({
    name: formatSourceType(name),
    value
  }))
  return {
    color: ['#4a63ee', '#8b5cf6', '#12b76a', '#f79009', '#0ea5e9', '#f04438'],
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { color: chartTextRegular.value } },
    series: [
      {
        type: 'pie',
        radius: ['42%', '72%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: chartSurfaceBg.value, borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold', color: chartTextRegular.value }
        },
        data: data.length > 0 ? data : [{ name: 'No data', value: 0 }]
      }
    ]
  }
})

const barOption = computed(() => {
  const c = systemStore.protocolCounts
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 60, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['RTSP Conn', 'RTSP Sess', 'RTMP', 'WebRTC', 'HLS', 'SRT'],
      axisLabel: { color: chartTextSecondary.value, fontSize: 11 },
      axisLine: { lineStyle: { color: chartAxisLine.value } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: chartTextSecondary.value },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: chartSplitLine.value } }
    },
    series: [
      {
        type: 'bar',
        barWidth: '46%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: (params: any) => {
            const colors = ['#4a63ee', '#8b5cf6', '#12b76a', '#f79009', '#0ea5e9', '#f04438']
            return colors[params.dataIndex % colors.length]
          }
        },
        data: [c.rtspConns, c.rtspSessions, c.rtmpConns, c.webrtcSessions, c.hlsMuxers, c.srtConns]
      }
    ]
  }
})

const bandwidthTrendOption = computed(() => {
  const data: [number, number][] = bandwidthRates.value.map(r => [r.time, r.rate])
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        return `${new Date(p.value[0]).toLocaleTimeString()}<br/>${formatBytes(p.value[1])}/s`
      }
    },
    grid: { left: 8, right: 8, top: 14, bottom: 8 },
    xAxis: { type: 'time', show: false },
    yAxis: { type: 'value', show: false, min: 0 },
    series: [
      {
        type: 'line',
        data,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#0ea5e9' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(14, 165, 233, 0.35)' },
              { offset: 1, color: 'rgba(14, 165, 233, 0)' }
            ]
          }
        }
      }
    ]
  }
})

const refreshData = async () => {
  try {
    await systemStore.fetchAll()
    recordBandwidthSample()
    lastUpdated.markUpdated()
  } finally {
    // Clear the one-shot loading mask even when the first fetch fails —
    // otherwise it stays on and keeps flashing over every refresh tick.
    initialLoading.value = false
  }
}

// The fast poll tick only refetches paths — that's what drives the trend
// chart, KPIs and the active-paths list. /info and the protocol counts are
// handled separately so the interval stays light.
const refreshPaths = async () => {
  try {
    await systemStore.fetchPaths()
    recordBandwidthSample()
    lastUpdated.markUpdated()
  } catch {
    systemStore.connected = false
  }
}

const handleRefresh = () => {
  refreshData().catch(() => {})
}

// Unlike other list views, auto refresh defaults on here — the dashboard is a
// read-only overview, so there's no risk of it interrupting anyone mid-edit,
// and it's what makes the bandwidth trend chart worth having. The toggle is
// persisted so a user who turns it off keeps it off.
const autoRefreshCtrl = useAutoRefresh(
  refreshPaths,
  AUTO_REFRESH_INTERVAL_MS,
  'autorefresh:home',
  true
)

let protocolTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  refreshData().catch(() => {})
  protocolTimer = setInterval(() => {
    if (document.hidden) return
    systemStore.fetchProtocolCounts().catch(() => {})
  }, PROTOCOL_COUNTS_INTERVAL_MS)
})

onBeforeUnmount(() => {
  if (protocolTimer) clearInterval(protocolTimer)
})
</script>

<style scoped>
.dashboard {
  --dash-blue: #4a63ee;
  --dash-violet: #8b5cf6;
  --dash-sky: #0ea5e9;
  --dash-green: #12b76a;
}

/* Hero */
.dash-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 18px;
}

.dash-hero-text h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.dash-hero-text p {
  margin: 4px 0 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.dash-hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dash-alert {
  margin-bottom: 20px;
}

/* Server health strip */
.health-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  padding: 14px 20px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--radius-lg);
  background: var(--el-bg-color);
  box-shadow: var(--card-shadow);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.health-strip.offline {
  border-color: rgba(240, 68, 56, 0.35);
}

.health-status {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.health-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--el-color-success);
  box-shadow: 0 0 0 4px rgba(18, 183, 106, 0.16);
  flex-shrink: 0;
}

.health-dot.offline {
  background: var(--el-color-danger);
  box-shadow: 0 0 0 4px rgba(240, 68, 56, 0.16);
}

.health-status-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  min-width: 0;
}

.health-status-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.health-status-sub {
  font-size: 11.5px;
  color: var(--el-text-color-secondary);
}

.health-divider {
  width: 1px;
  height: 28px;
  background: var(--el-border-color-lighter);
}

.health-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 92px;
}

.health-stat-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--el-text-color-secondary);
}

.health-stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.health-stat-suffix {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

/* KPI cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.kpi-card {
  padding: 18px 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--radius-lg);
  background: var(--el-bg-color);
  box-shadow: var(--card-shadow);
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease,
    border-color 0.2s ease;
}

.kpi-card:hover {
  box-shadow: var(--card-shadow-hover);
  transform: translateY(-2px);
  border-color: var(--el-border-color);
}

.kpi-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.kpi-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.kpi-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.kpi-value {
  margin-bottom: 6px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-primary);
}

.kpi-context {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.kpi-context-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Panel headers inside cards */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
}

.panel-icon {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.panel-hint {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-stats {
  display: flex;
  gap: 8px;
}

.panel-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--radius-pill);
  background: var(--el-fill-color-light);
}

.panel-stat-label {
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--el-text-color-secondary);
}

.panel-stat-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
}

/* Tinted panel icon chips (light + dark variants) */
.panel-icon.tint-blue {
  color: var(--dash-blue);
  background: rgba(74, 99, 238, 0.1);
}

.panel-icon.tint-violet {
  color: var(--dash-violet);
  background: rgba(139, 92, 246, 0.1);
}

.panel-icon.tint-sky {
  color: var(--dash-sky);
  background: rgba(14, 165, 233, 0.1);
}

.panel-icon.tint-green {
  color: var(--dash-green);
  background: rgba(18, 183, 106, 0.1);
}

:root.dark .dashboard {
  --dash-blue: #6b84ff;
  --dash-violet: #a78bfa;
  --dash-sky: #38bdf8;
  --dash-green: #32d583;
}

:root.dark .panel-icon.tint-blue {
  background: rgba(107, 132, 255, 0.18);
}

:root.dark .panel-icon.tint-violet {
  background: rgba(167, 139, 250, 0.18);
}

:root.dark .panel-icon.tint-sky {
  background: rgba(56, 189, 248, 0.18);
}

:root.dark .panel-icon.tint-green {
  background: rgba(50, 213, 131, 0.18);
}

/* Layout */
.dash-card {
  margin-bottom: 20px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Placeholder must match the chart height (180px) exactly, otherwise the card
   jumps by 60px the moment the first samples arrive. */
.bandwidth-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.path-link {
  font-weight: 500;
}

.source-cell {
  color: var(--el-text-color-regular);
}

@media (max-width: 1000px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dash-hero-text h1 {
    font-size: 22px;
  }

  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
