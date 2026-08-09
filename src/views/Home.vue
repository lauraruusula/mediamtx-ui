<template>
  <div>
    <div class="page-header">
      <p class="page-subtitle" style="margin: 0">
        Live overview of paths, connections, and server health.
      </p>
      <div class="page-actions">
        <el-switch
          v-model="autoRefreshCtrl.active.value"
          active-text="Auto refresh (5s)"
          @change="autoRefreshCtrl.toggle"
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
      style="margin-bottom: 20px"
    />

    <!-- Stat Cards -->
    <div class="stat-grid">
      <el-card v-for="(card, i) in statCards" :key="i" class="stat-card" shadow="never">
        <div class="stat-card-accent" :style="{ background: card.color }" />
        <div class="stat-card-inner">
          <div class="stat-card-icon" :style="{ background: card.gradient }">
            <el-icon><component :is="card.icon" /></el-icon>
          </div>
          <div class="stat-card-info">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- Charts -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :xs="24" :md="12" style="margin-bottom: 12px">
        <el-card shadow="hover">
          <template #header>
            <div class="chart-card-header">
              <span class="chart-card-icon" style="background: var(--stat-badge-1)">
                <el-icon><PieChart /></el-icon>
              </span>
              <span class="chart-card-title">Source Type Distribution</span>
            </div>
          </template>
          <v-chart :option="pieOption" style="height: 280px" autoresize />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12" style="margin-bottom: 12px">
        <el-card shadow="hover">
          <template #header>
            <div class="chart-card-header">
              <span class="chart-card-icon" style="background: var(--stat-badge-2)">
                <el-icon><Histogram /></el-icon>
              </span>
              <span class="chart-card-title">Protocol Connections</span>
            </div>
          </template>
          <v-chart :option="barOption" style="height: 280px" autoresize />
        </el-card>
      </el-col>
    </el-row>

    <!-- Bandwidth trend -->
    <el-card shadow="hover" style="margin-bottom: 20px">
      <template #header>
        <div class="chart-card-header">
          <span class="chart-card-icon" style="background: var(--stat-badge-5)">
            <el-icon><TrendCharts /></el-icon>
          </span>
          <span class="chart-card-title">Bandwidth Trend</span>
          <span class="chart-card-hint">this session, updates every {{ SAMPLE_INTERVAL_S }}s</span>
        </div>
      </template>
      <v-chart
        v-if="bandwidthHistory.length > 1"
        :option="bandwidthTrendOption"
        style="height: 140px"
        autoresize
      />
      <div v-else class="bandwidth-placeholder">
        Collecting samples — turn on auto refresh to watch bandwidth over time.
      </div>
    </el-card>

    <!-- Active Paths Table -->
    <el-card shadow="hover">
      <template #header>
        <div class="chart-card-header" style="justify-content: space-between">
          <div class="chart-card-header">
            <span class="chart-card-icon" style="background: var(--stat-badge-1)">
              <el-icon><Connection /></el-icon>
            </span>
            <span class="chart-card-title">Active Paths</span>
          </div>
          <div style="display: flex; gap: 8px">
            <el-button text type="primary" @click="$router.push('/paths')">View All</el-button>
            <el-button
              :icon="Refresh"
              circle
              size="small"
              :loading="systemStore.loading"
              aria-label="Refresh"
              @click="refreshData"
            />
          </div>
        </div>
      </template>
      <el-table
        v-loading="systemStore.loading"
        :data="systemStore.paths.slice(0, 8)"
        style="width: 100%"
      >
        <el-table-column prop="name" label="Path Name" min-width="150" show-overflow-tooltip />
        <el-table-column label="Status" width="80">
          <template #default="{ row }">
            <el-tag :type="row.online ? 'success' : 'info'" size="small">
              {{ row.online ? 'Online' : 'Offline' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Source Type" width="120">
          <template #default="{ row }">
            <span>{{ row.source ? formatSourceType(row.source.type) : '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Readers" width="80" align="center">
          <template #default="{ row }">{{ row.readers?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="Inbound Traffic" width="110">
          <template #default="{ row }">{{ formatBytes(row.inboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column label="Outbound Traffic" width="110">
          <template #default="{ row }">{{ formatBytes(row.outboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="90" fixed="right">
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
                  @click="openPlayer(row)"
                />
              </el-tooltip>
              <CopyLinkButton :path-name="row.name" />
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!systemStore.loading && systemStore.paths.length === 0"
        description="No paths"
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
import { ref, computed, onMounted } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useThemeStore } from '@/stores/theme'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { formatBytes, formatUptime, formatSourceType } from '@/composables/useFormatters'
import {
  Refresh,
  Connection,
  VideoPlay,
  Timer,
  UserFilled,
  TrendCharts,
  PieChart,
  Histogram
} from '@element-plus/icons-vue'
import StreamPlayer from '@/components/StreamPlayer.vue'
import CopyLinkButton from '@/components/CopyLinkButton.vue'
import { useCountUp } from '@/composables/useCountUp'
import type { APIPath } from '@/types/api'

const SAMPLE_INTERVAL_S = 5
const MAX_SAMPLES = 60 // 5 minutes of history at the default 5s refresh interval

const systemStore = useSystemStore()
const themeStore = useThemeStore()
const playerVisible = ref(false)
const playingPath = ref('')

// Purely cosmetic: animate the integer stat tiles counting up on load/refresh.
// Uptime and Bandwidth are formatted strings, not raw integers, so they're
// left as direct display values.
const totalPathsDisplay = useCountUp(() => systemStore.pathCount)
const onlinePathsDisplay = useCountUp(() => systemStore.onlinePaths.length)
const readersDisplay = useCountUp(() => systemStore.totalReaders)

// MediaMTX's API is a snapshot with no history, so the bandwidth trend chart
// keeps its own small client-side rolling buffer, sampled on every refresh.
interface BandwidthSample {
  time: number
  bytes: number
}
const bandwidthHistory = ref<BandwidthSample[]>([])

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

const statCards = computed(() => [
  {
    icon: Connection,
    label: 'Total Paths',
    value: totalPathsDisplay.value,
    gradient: 'var(--stat-badge-1)',
    color: 'var(--stat-accent-1)'
  },
  {
    icon: VideoPlay,
    label: 'Online Paths',
    value: onlinePathsDisplay.value,
    gradient: 'var(--stat-badge-2)',
    color: 'var(--stat-accent-2)'
  },
  {
    icon: UserFilled,
    label: 'Readers',
    value: readersDisplay.value,
    gradient: 'var(--stat-badge-3)',
    color: 'var(--stat-accent-3)'
  },
  {
    icon: Timer,
    label: 'Server Uptime',
    value: formatUptime(systemStore.info?.started),
    gradient: 'var(--stat-badge-4)',
    color: 'var(--stat-accent-4)'
  },
  {
    icon: TrendCharts,
    label: 'Total Bandwidth',
    value: formatBytes(systemStore.totalInboundBytes + systemStore.totalOutboundBytes),
    gradient: 'var(--stat-badge-5)',
    color: 'var(--stat-accent-5)'
  }
])

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
        radius: ['40%', '70%'],
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
        barWidth: '50%',
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
  const data = bandwidthHistory.value.map(s => [s.time, s.bytes])
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        return `${new Date(p.value[0]).toLocaleTimeString()}<br/>${formatBytes(p.value[1])}`
      }
    },
    grid: { left: 4, right: 4, top: 12, bottom: 4 },
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
  await systemStore.fetchAll()
  recordBandwidthSample()
}

// Unlike other list views, auto refresh defaults on here — the dashboard is a
// read-only overview, so there's no risk of it interrupting anyone mid-edit,
// and it's what makes the bandwidth trend chart worth having.
const autoRefreshCtrl = useAutoRefresh(refreshData)

onMounted(() => {
  refreshData()
  autoRefreshCtrl.start()
})
</script>
