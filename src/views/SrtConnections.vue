<template>
  <div>
    <div class="page-header">
      <h1>
        SRT Connections <el-tag size="small" round>{{ displayedCount }}</el-tag>
      </h1>
      <div v-if="!protocolDisabled" class="page-actions">
        <el-input
          v-model="search"
          placeholder="Search connections"
          clearable
          style="width: 200px"
          :prefix-icon="Search"
        />
        <el-button
          v-if="bulk.selection.length"
          type="danger"
          :icon="SwitchButton"
          :loading="bulk.kicking"
          @click="handleKickSelected"
        >
          Kick {{ bulk.selection.length }} selected
        </el-button>
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
        <span v-if="lastUpdated.label" class="updated-hint">{{ lastUpdated.label }}</span>
        <el-button :icon="Download" @click="exportCsvData">Export</el-button>
        <el-button :icon="Refresh" :loading="store.loading" @click="loadData">Refresh</el-button>
      </div>
    </div>
    <p class="page-subtitle">Active SRT publish and playback connections.</p>
    <ProtocolDisabled
      v-if="protocolDisabled"
      protocol="SRT"
      feature-label="connections"
      tab-name="srt"
    />
    <template v-else>
      <ApiErrorBanner :message="error" :loading="store.loading" @retry="loadData" />
      <el-card shadow="never">
        <el-table
          ref="tableRef"
          v-loading="initialLoading"
          :data="filteredList"
          style="width: 100%"
          :default-sort="sort.defaultSort"
          row-key="id"
          @sort-change="sort.onSortChange"
          @selection-change="bulk.onSelectionChange"
        >
          <el-table-column type="selection" width="42" reserve-selection />
          <el-table-column prop="id" label="ID" width="280" show-overflow-tooltip />
          <el-table-column label="Status" width="110">
            <template #default="{ row }">
              <el-tag
                :type="
                  row.state === 'publish' ? 'danger' : row.state === 'read' ? 'success' : 'info'
                "
                size="small"
              >
                {{ formatState(row.state) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="Path" min-width="130" show-overflow-tooltip>
            <template #default="{ row }"><PathLink :path="row.path" /></template>
          </el-table-column>
          <el-table-column label="Health" width="120">
            <template #default="{ row }">
              <HealthBadge :info="srtConnHealth(row)" />
            </template>
          </el-table-column>
          <el-table-column prop="remoteAddr" label="Remote Address" width="140" />
          <el-table-column
            label="Packets Sent"
            width="125"
            align="center"
            sortable
            prop="packetsSent"
          >
            <template #default="{ row }">{{ row.packetsSent || 0 }}</template>
          </el-table-column>
          <el-table-column
            label="Packets Received"
            width="145"
            align="center"
            sortable
            prop="packetsReceived"
          >
            <template #default="{ row }">{{ row.packetsReceived || 0 }}</template>
          </el-table-column>
          <el-table-column label="RTT (ms)" width="95" align="center" sortable prop="msRTT">
            <template #default="{ row }">{{ row.msRTT?.toFixed(1) || '-' }}</template>
          </el-table-column>
          <el-table-column label="Actions" width="125" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-tooltip content="View details" placement="top">
                  <el-button
                    :icon="View"
                    circle
                    size="small"
                    plain
                    aria-label="View details"
                    @click="openDetail(row as APISRTConn)"
                  />
                </el-tooltip>
                <el-popconfirm
                  title="Kick this connection? The client will be disconnected immediately."
                  @confirm="handleKick(row.id)"
                >
                  <template #reference>
                    <el-button
                      :icon="SwitchButton"
                      circle
                      size="small"
                      type="danger"
                      plain
                      title="Kick"
                      aria-label="Kick"
                    />
                  </template>
                </el-popconfirm>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-empty
          v-if="!error && !initialLoading && filteredList.length === 0"
          :description="search ? `No connections match “${search}”` : 'No SRT connections yet'"
        />
        <div v-if="!search && store.itemCount > 0" class="pagination-bar">
          <el-pagination
            v-model:current-page="pagination.page.value"
            v-model:page-size="pagination.pageSize.value"
            background
            layout="total, sizes, prev, pager, next"
            :total="store.itemCount"
            :page-sizes="[10, 20, 50, 100]"
            @current-change="pagination.handlePageChange"
            @size-change="pagination.handleSizeChange"
          />
        </div>
      </el-card>
    </template>

    <SessionDetailDrawer
      v-model="detailVisible"
      :title="current ? `SRT Connection ${current.id.slice(0, 8)}…` : ''"
      :rows="detailRows"
      :refreshing="refreshingDetail"
      @refresh="refreshDetail"
    >
      <template #actions>
        <el-button
          v-if="current"
          type="danger"
          size="small"
          plain
          :icon="SwitchButton"
          @click="handleKick(current.id)"
        >
          Kick
        </el-button>
      </template>
    </SessionDetailDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSrtConnStore } from '@/stores/srtConn'
import { useActivityStore } from '@/stores/activity'
import { useProtocolGuard } from '@/composables/useProtocolGuard'
import { usePagination } from '@/composables/usePagination'
import {
  useAutoRefresh,
  AUTO_REFRESH_INTERVAL_MS,
  AUTO_REFRESH_INTERVAL_OPTIONS_MS
} from '@/composables/useAutoRefresh'
import { useSearchableList, filterList } from '@/composables/useSearchableList'
import { useLastUpdated } from '@/composables/useLastUpdated'
import { useListError } from '@/composables/useListError'
import { useTableSort } from '@/composables/useTableSort'
import { useBulkKick, type KickableTable } from '@/composables/useBulkKick'
import { exportCsv } from '@/composables/useCsvExport'
import { formatDate, formatState } from '@/composables/useFormatters'
import { srtConnHealth, healthTagType } from '@/composables/useStreamHealth'
import { Refresh, Search, SwitchButton, Download, View } from '@element-plus/icons-vue'
import { getErrorMessage } from '@/composables/useErrorMessage'
import { toast } from '@/composables/useToast'
import PathLink from '@/components/PathLink.vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import ProtocolDisabled from '@/components/ProtocolDisabled.vue'
import HealthBadge from '@/components/HealthBadge.vue'
import SessionDetailDrawer, { type DetailRow } from '@/components/SessionDetailDrawer.vue'
import type { APISRTConn } from '@/types/api'

const store = useSrtConnStore()
const activityStore = useActivityStore()
// The server 404s /v3/srtconns/* when SRT is disabled, so we skip the fetch
// and show a friendly explanation instead of the raw API error.
const { disabled: protocolDisabled, guard } = useProtocolGuard('srt')
const pagination = usePagination(
  (page, itemsPerPage) => store.fetchList(page, itemsPerPage),
  20,
  'pagesize:srt-connections'
)
const lastUpdated = useLastUpdated()
const search = ref('')
// The loading mask is only meaningful while the table has nothing to render —
// showing it on every auto-refresh tick makes the panel flash. Once the first
// fetch lands, refreshes update rows in place and the refresh button's own
// spinner covers the loading state.
const initialLoading = ref(true)
const { error, run } = useListError()
const sort = useTableSort('sort:srt-connections')
const tableRef = ref<KickableTable | null>(null)
const bulk = useBulkKick(store, 'SRT connection')

const detailVisible = ref(false)
const current = ref<APISRTConn | null>(null)
const refreshingDetail = ref(false)

const filteredList = computed(() =>
  filterList(
    store.list,
    search.value,
    (c: APISRTConn) => c.id + ' ' + (c.path || '') + ' ' + (c.remoteAddr || '')
  )
)

// While searching, the badge reflects what's on screen rather than the server
// total (the list is fetched in full and filtered client-side).
const displayedCount = computed(() =>
  search.value.trim() ? filteredList.value.length : store.itemCount
)

const loadData = async () => {
  if (!(await guard())) return
  await run(async () => {
    if (search.value.trim()) {
      await store.fetchList(0, 1000)
    } else {
      await pagination.load()
    }
    initialLoading.value = false
    lastUpdated.markUpdated()
  }, 'Failed to load SRT connections')
}

useSearchableList(search, () => loadData())

const handleKick = async (id: string) => {
  try {
    await store.kick(id)
    toast.success('Connection kicked')
    activityStore.log(`Kicked an SRT connection (${id.slice(0, 8)}…)`, 'error')
    if (current.value?.id === id) current.value = null
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to kick connection'))
  }
}

const detailRows = computed<DetailRow[]>(() => {
  const c = current.value
  if (!c) return []
  const health = srtConnHealth(c)
  const fmtMs = (v: number | undefined) => (typeof v === 'number' ? `${v.toFixed(1)} ms` : '—')
  return [
    { label: 'ID', value: c.id },
    {
      label: 'Status',
      tag: {
        text: formatState(c.state),
        type: c.state === 'publish' ? 'danger' : c.state === 'read' ? 'success' : 'info'
      }
    },
    { label: 'Path', value: c.path || '—' },
    { label: 'Remote Address', value: c.remoteAddr || '—' },
    { label: 'User', value: c.user || '—' },
    { label: 'Health', tag: { text: health.label, type: healthTagType(health.level) } },
    { label: 'Packets Sent', value: c.packetsSent || 0 },
    { label: 'Packets Received', value: c.packetsReceived || 0 },
    { label: 'Send Loss', value: c.packetsSendLoss || 0 },
    { label: 'Receive Loss', value: c.packetsReceivedLoss || 0 },
    { label: 'Retransmissions', value: c.packetsRetrans || 0 },
    { label: 'RTT', value: fmtMs(c.msRTT) },
    {
      label: 'Send Rate',
      value: typeof c.mbpsSendRate === 'number' ? `${c.mbpsSendRate.toFixed(2)} Mbps` : '—'
    },
    {
      label: 'Receive Rate',
      value: typeof c.mbpsReceiveRate === 'number' ? `${c.mbpsReceiveRate.toFixed(2)} Mbps` : '—'
    },
    { label: 'Created', value: formatDate(c.created) }
  ]
})

const openDetail = (row: APISRTConn) => {
  current.value = row
  detailVisible.value = true
}

const refreshDetail = async () => {
  if (!current.value) return
  refreshingDetail.value = true
  try {
    await loadData()
    const fresh = store.list.find(c => c.id === current.value!.id)
    if (fresh) current.value = fresh
  } finally {
    refreshingDetail.value = false
  }
}

const handleKickSelected = async () => {
  await bulk.kickSelected(tableRef)
  await loadData()
}

const exportCsvData = () => {
  exportCsv(
    `srt-connections-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      'ID',
      'Status',
      'Path',
      'Remote Address',
      'Health',
      'Packets Sent',
      'Packets Received',
      'RTT (ms)'
    ],
    filteredList.value.map(c => [
      c.id,
      formatState(c.state),
      c.path || '',
      c.remoteAddr || '',
      srtConnHealth(c).label,
      c.packetsSent || 0,
      c.packetsReceived || 0,
      typeof c.msRTT === 'number' ? c.msRTT.toFixed(1) : ''
    ])
  )
}

const autoRefreshCtrl = useAutoRefresh(
  loadData,
  AUTO_REFRESH_INTERVAL_MS,
  'autorefresh:srt-connections'
)
onMounted(() => {
  loadData()
})
</script>
