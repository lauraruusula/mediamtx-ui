<template>
  <div>
    <div class="page-header">
      <h1>
        RTSP Sessions <el-tag size="small" round>{{ displayedCount }}</el-tag>
      </h1>
      <div v-if="!protocolDisabled" class="page-actions">
        <el-input
          v-model="search"
          placeholder="Search sessions"
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
    <p class="page-subtitle">
      Logical RTSP publish/read sessions, one per client. Kick a session to disconnect its client.
    </p>
    <ProtocolDisabled
      v-if="protocolDisabled"
      protocol="RTSP"
      feature-label="sessions"
      tab-name="rtsp"
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
          <el-table-column label="Path" min-width="150" show-overflow-tooltip>
            <template #default="{ row }"><PathLink :path="row.path" /></template>
          </el-table-column>
          <el-table-column prop="remoteAddr" label="Remote Address" width="160" />
          <el-table-column label="Inbound" width="120" sortable prop="inboundBytes">
            <template #default="{ row }">{{ formatBytes(row.inboundBytes || 0) }}</template>
          </el-table-column>
          <el-table-column label="Outbound" width="120" sortable prop="outboundBytes">
            <template #default="{ row }">{{ formatBytes(row.outboundBytes || 0) }}</template>
          </el-table-column>
          <el-table-column label="Actions" width="90" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-popconfirm
                  title="Kick this session? The client will be disconnected immediately."
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
          :description="search ? `No sessions match “${search}”` : 'No RTSP sessions yet'"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRtspSessionStore } from '@/stores/rtspSession'
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
import { formatBytes, formatState } from '@/composables/useFormatters'
import { Refresh, Search, SwitchButton, Download } from '@element-plus/icons-vue'
import { getErrorMessage } from '@/composables/useErrorMessage'
import { toast } from '@/composables/useToast'
import PathLink from '@/components/PathLink.vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import ProtocolDisabled from '@/components/ProtocolDisabled.vue'
import type { APIRTSPSession } from '@/types/api'

const store = useRtspSessionStore()
const activityStore = useActivityStore()
// The server 404s /v3/rtspsessions/* when RTSP is disabled, so we skip the
// fetch and show a friendly explanation instead of the raw API error.
const { disabled: protocolDisabled, guard } = useProtocolGuard('rtsp')
const pagination = usePagination(
  (page, itemsPerPage) => store.fetchList(page, itemsPerPage),
  20,
  'pagesize:rtsp-sessions'
)
const lastUpdated = useLastUpdated()
const search = ref('')
// The loading mask is only meaningful while the table has nothing to render —
// showing it on every auto-refresh tick makes the panel flash. Once the first
// fetch lands, refreshes update rows in place and the refresh button's own
// spinner covers the loading state.
const initialLoading = ref(true)
const { error, run } = useListError()
const sort = useTableSort('sort:rtsp-sessions')
const tableRef = ref<KickableTable | null>(null)
const bulk = useBulkKick(store, 'RTSP session')

const filteredList = computed(() =>
  filterList(
    store.list,
    search.value,
    (s: APIRTSPSession) => s.id + ' ' + (s.path || '') + ' ' + (s.remoteAddr || '')
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
  }, 'Failed to load RTSP sessions')
}

useSearchableList(search, () => loadData())

const handleKick = async (id: string) => {
  try {
    await store.kick(id)
    toast.success('Session kicked')
    activityStore.log(`Kicked an RTSP session (${id.slice(0, 8)}…)`, 'error')
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to kick session'))
  }
}

const handleKickSelected = async () => {
  await bulk.kickSelected(tableRef)
  await loadData()
}

const exportCsvData = () => {
  exportCsv(
    `rtsp-sessions-${new Date().toISOString().slice(0, 10)}.csv`,
    ['ID', 'Status', 'Path', 'Remote Address', 'Inbound', 'Outbound'],
    filteredList.value.map(s => [
      s.id,
      formatState(s.state),
      s.path || '',
      s.remoteAddr || '',
      s.inboundBytes || 0,
      s.outboundBytes || 0
    ])
  )
}

const autoRefreshCtrl = useAutoRefresh(
  loadData,
  AUTO_REFRESH_INTERVAL_MS,
  'autorefresh:rtsp-sessions'
)
onMounted(() => {
  loadData()
})
</script>
