<template>
  <div>
    <div class="page-header">
      <h1>
        WebRTC Sessions <el-tag size="small" round>{{ store.itemCount }}</el-tag>
      </h1>
      <div class="page-actions">
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
          :active-text="`Auto refresh (${AUTO_REFRESH_INTERVAL_S}s)`"
          @change="autoRefreshCtrl.toggle"
        />
        <span v-if="lastUpdated.label" class="updated-hint">{{ lastUpdated.label }}</span>
        <el-button :icon="Download" @click="exportCsvData">Export</el-button>
        <el-button :icon="Refresh" :loading="store.loading" @click="loadData">Refresh</el-button>
      </div>
    </div>
    <p class="page-subtitle">Active WebRTC (WHIP/WHEP) publish and playback sessions.</p>
    <ApiErrorBanner :message="error" :loading="store.loading" @retry="loadData" />

    <el-card shadow="hover">
      <el-table
        ref="tableRef"
        v-loading="store.loading"
        :data="filteredList"
        style="width: 100%"
        :default-sort="sort.defaultSort"
        @sort-change="sort.onSortChange"
        @selection-change="bulk.onSelectionChange"
      >
        <el-table-column type="selection" width="42" />
        <el-table-column prop="id" label="ID" width="280" show-overflow-tooltip />
        <el-table-column label="Status" width="80">
          <template #default="{ row }">
            <el-tag :type="row.state === 'publish' ? 'danger' : 'success'" size="small">
              {{ formatState(row.state) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Path" min-width="150" show-overflow-tooltip>
          <template #default="{ row }"><PathLink :path="row.path" /></template>
        </el-table-column>
        <el-table-column prop="remoteAddr" label="Remote Address" width="160" />
        <el-table-column label="PeerConn" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.peerConnectionEstablished ? 'success' : 'warning'" size="small">
              {{ row.peerConnectionEstablished ? 'Established' : 'Not Established' }}
            </el-tag>
          </template>
        </el-table-column>
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
        v-if="!store.loading && filteredList.length === 0"
        :description="search ? `No sessions match “${search}”` : 'No WebRTC sessions yet'"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWebRTCStore } from '@/stores/webrtc'
import { useActivityStore } from '@/stores/activity'
import { usePagination } from '@/composables/usePagination'
import { useAutoRefresh, AUTO_REFRESH_INTERVAL_MS } from '@/composables/useAutoRefresh'
import { useSearchableList, filterList } from '@/composables/useSearchableList'
import { useLastUpdated } from '@/composables/useLastUpdated'
import { useListError } from '@/composables/useListError'
import { useTableSort } from '@/composables/useTableSort'
import { useBulkKick, type KickableTable } from '@/composables/useBulkKick'
import { exportCsv } from '@/composables/useCsvExport'
import { formatBytes, formatState } from '@/composables/useFormatters'
import { ElMessage } from 'element-plus'
import { Refresh, Search, SwitchButton, Download } from '@element-plus/icons-vue'
import { getErrorMessage } from '@/composables/useErrorMessage'
import PathLink from '@/components/PathLink.vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import type { APIWebRTCSession } from '@/types/api'

const AUTO_REFRESH_INTERVAL_S = AUTO_REFRESH_INTERVAL_MS / 1000

const store = useWebRTCStore()
const activityStore = useActivityStore()
const pagination = usePagination(
  (page, itemsPerPage) => store.fetchList(page, itemsPerPage),
  20,
  'pagesize:webrtc-sessions'
)
const lastUpdated = useLastUpdated()
const search = ref('')
const { error, run } = useListError()
const sort = useTableSort('sort:webrtc-sessions')
const tableRef = ref<KickableTable | null>(null)
const bulk = useBulkKick(store, 'WebRTC session')

const filteredList = computed(() =>
  filterList(
    store.list,
    search.value,
    (s: APIWebRTCSession) => s.id + ' ' + (s.path || '') + ' ' + (s.remoteAddr || '')
  )
)

const loadData = async () => {
  await run(async () => {
    if (search.value.trim()) {
      await store.fetchList(0, 1000)
    } else {
      await pagination.load()
    }
    lastUpdated.markUpdated()
  }, 'Failed to load WebRTC sessions')
}

useSearchableList(search, () => loadData())

const handleKick = async (id: string) => {
  try {
    await store.kick(id)
    ElMessage.success('Session kicked')
    activityStore.log(`Kicked a WebRTC session (${id.slice(0, 8)}…)`, 'error')
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Failed to kick session'))
  }
}

const handleKickSelected = async () => {
  await bulk.kickSelected(tableRef)
  await loadData()
}

const exportCsvData = () => {
  exportCsv(
    `webrtc-sessions-${new Date().toISOString().slice(0, 10)}.csv`,
    ['ID', 'Status', 'Path', 'Remote Address', 'Peer Connection', 'Inbound', 'Outbound'],
    filteredList.value.map(s => [
      s.id,
      formatState(s.state),
      s.path || '',
      s.remoteAddr || '',
      s.peerConnectionEstablished ? 'Established' : 'Not Established',
      s.inboundBytes || 0,
      s.outboundBytes || 0
    ])
  )
}

const autoRefreshCtrl = useAutoRefresh(
  loadData,
  AUTO_REFRESH_INTERVAL_MS,
  'autorefresh:webrtc-sessions'
)
onMounted(() => {
  loadData()
})
</script>
