<template>
  <div>
    <div class="page-header">
      <h1>
        RTSP Connections <el-tag size="small" round>{{ displayedCount }}</el-tag>
      </h1>
      <div v-if="!protocolDisabled" class="page-actions">
        <el-input
          v-model="search"
          placeholder="Search connections"
          clearable
          style="width: 200px"
          :prefix-icon="Search"
        />
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
    <p class="page-subtitle">
      Raw TCP-level RTSP connections. Read-only — see
      <router-link class="cell-link" to="/rtsp/sessions">RTSP Sessions</router-link> to disconnect a
      client.
    </p>
    <ProtocolDisabled
      v-if="protocolDisabled"
      protocol="RTSP"
      feature-label="connections"
      tab-name="rtsp"
    />
    <template v-else>
      <ApiErrorBanner :message="error" :loading="store.loading" @retry="loadData" />
      <el-card shadow="never">
        <el-table
          v-loading="initialLoading"
          :data="filteredList"
          style="width: 100%"
          :default-sort="sort.defaultSort"
          @sort-change="sort.onSortChange"
        >
          <el-table-column prop="id" label="ID" width="280" show-overflow-tooltip />
          <el-table-column label="Remote Address" prop="remoteAddr" min-width="160" />
          <el-table-column label="Tunnel" prop="tunnel" width="100" />
          <el-table-column label="Inbound" width="120" sortable prop="inboundBytes">
            <template #default="{ row }">{{ formatBytes(row.inboundBytes || 0) }}</template>
          </el-table-column>
          <el-table-column label="Outbound" width="120" sortable prop="outboundBytes">
            <template #default="{ row }">{{ formatBytes(row.outboundBytes || 0) }}</template>
          </el-table-column>
          <el-table-column
            label="Created"
            width="170"
            sortable
            :sort-method="
              (a: any, b: any) =>
                (new Date(a.created).getTime() || 0) - (new Date(b.created).getTime() || 0)
            "
          >
            <template #default="{ row }">{{ formatDate(row.created) }}</template>
          </el-table-column>
          <el-table-column label="Actions" width="90" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-tooltip content="View details" placement="top">
                  <el-button
                    :icon="View"
                    circle
                    size="small"
                    type="primary"
                    plain
                    aria-label="View details"
                    @click="openDetail(row as APIRTSPConn)"
                  />
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-empty
          v-if="!error && !initialLoading && filteredList.length === 0"
          :description="search ? `No connections match “${search}”` : 'No RTSP connections yet'"
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
      :title="current ? `RTSP Connection ${current.id.slice(0, 8)}…` : ''"
      :rows="detailRows"
      :refreshing="refreshingDetail"
      @refresh="refreshDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRtspConnStore } from '@/stores/rtspConn'
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
import { exportCsv } from '@/composables/useCsvExport'
import { formatBytes, formatDate } from '@/composables/useFormatters'
import { Refresh, Search, Download, View } from '@element-plus/icons-vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import ProtocolDisabled from '@/components/ProtocolDisabled.vue'
import SessionDetailDrawer, { type DetailRow } from '@/components/SessionDetailDrawer.vue'
import type { APIRTSPConn } from '@/types/api'

const store = useRtspConnStore()
// The server 404s /v3/rtspconns/* when RTSP is disabled, so we skip the fetch
// and show a friendly explanation instead of the raw API error.
const { disabled: protocolDisabled, guard } = useProtocolGuard('rtsp')
const pagination = usePagination(
  (page, itemsPerPage) => store.fetchList(page, itemsPerPage),
  20,
  'pagesize:rtsp-connections'
)
const lastUpdated = useLastUpdated()
const search = ref('')
// The loading mask is only meaningful while the table has nothing to render —
// showing it on every auto-refresh tick makes the panel flash. Once the first
// fetch lands, refreshes update rows in place and the refresh button's own
// spinner covers the loading state.
const initialLoading = ref(true)
const { error, run } = useListError()
const sort = useTableSort('sort:rtsp-connections')

const filteredList = computed(() =>
  filterList(store.list, search.value, (c: APIRTSPConn) => c.id + ' ' + (c.remoteAddr || ''))
)

// While searching, the badge reflects what's on screen rather than the server
// total (the list is fetched in full and filtered client-side).
const displayedCount = computed(() =>
  search.value.trim() ? filteredList.value.length : store.itemCount
)

const detailVisible = ref(false)
const current = ref<APIRTSPConn | null>(null)
const refreshingDetail = ref(false)

const detailRows = computed<DetailRow[]>(() => {
  const c = current.value
  if (!c) return []
  return [
    { label: 'ID', value: c.id },
    { label: 'Remote Address', value: c.remoteAddr || '—' },
    { label: 'Tunnel', value: c.tunnel || '—' },
    { label: 'Session', value: c.session || '—' },
    { label: 'Inbound Traffic', value: formatBytes(c.inboundBytes || 0) },
    { label: 'Outbound Traffic', value: formatBytes(c.outboundBytes || 0) },
    { label: 'Created', value: formatDate(c.created) }
  ]
})

const openDetail = (row: APIRTSPConn) => {
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
  }, 'Failed to load RTSP connections')
}

useSearchableList(search, () => loadData())

const exportCsvData = () => {
  exportCsv(
    `rtsp-connections-${new Date().toISOString().slice(0, 10)}.csv`,
    ['ID', 'Remote Address', 'Tunnel', 'Session', 'Inbound', 'Outbound', 'Created'],
    filteredList.value.map(c => [
      c.id,
      c.remoteAddr || '',
      c.tunnel || '',
      c.session || '',
      c.inboundBytes || 0,
      c.outboundBytes || 0,
      formatDate(c.created)
    ])
  )
}

const autoRefreshCtrl = useAutoRefresh(
  loadData,
  AUTO_REFRESH_INTERVAL_MS,
  'autorefresh:rtsp-connections'
)
onMounted(() => {
  loadData()
})
</script>
