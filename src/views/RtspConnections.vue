<template>
  <div>
    <div class="page-header">
      <h1>
        RTSP Connections <el-tag size="small" round>{{ store.itemCount }}</el-tag>
      </h1>
      <div class="page-actions">
        <el-input
          v-model="search"
          placeholder="Search connections"
          clearable
          style="width: 200px"
          :prefix-icon="Search"
        />
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
    <p class="page-subtitle">
      Raw TCP-level RTSP connections. Read-only — see RTSP Sessions to disconnect a client.
    </p>
    <ApiErrorBanner :message="error" :loading="store.loading" @retry="loadData" />

    <el-card shadow="hover">
      <el-table
        v-loading="store.loading"
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
            (a: any, b: any) => new Date(a.created).getTime() - new Date(b.created).getTime()
          "
        >
          <template #default="{ row }">{{ formatDate(row.created) }}</template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!store.loading && filteredList.length === 0"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRtspConnStore } from '@/stores/rtspConn'
import { usePagination } from '@/composables/usePagination'
import { useAutoRefresh, AUTO_REFRESH_INTERVAL_MS } from '@/composables/useAutoRefresh'
import { useSearchableList, filterList } from '@/composables/useSearchableList'
import { useLastUpdated } from '@/composables/useLastUpdated'
import { useListError } from '@/composables/useListError'
import { useTableSort } from '@/composables/useTableSort'
import { exportCsv } from '@/composables/useCsvExport'
import { formatBytes, formatDate } from '@/composables/useFormatters'
import { Refresh, Search, Download } from '@element-plus/icons-vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import type { APIRTSPConn } from '@/types/api'

const AUTO_REFRESH_INTERVAL_S = AUTO_REFRESH_INTERVAL_MS / 1000

const store = useRtspConnStore()
const pagination = usePagination(
  (page, itemsPerPage) => store.fetchList(page, itemsPerPage),
  20,
  'pagesize:rtsp-connections'
)
const lastUpdated = useLastUpdated()
const search = ref('')
const { error, run } = useListError()
const sort = useTableSort('sort:rtsp-connections')

const filteredList = computed(() =>
  filterList(store.list, search.value, (c: APIRTSPConn) => c.id + ' ' + (c.remoteAddr || ''))
)

const loadData = async () => {
  await run(async () => {
    if (search.value.trim()) {
      await store.fetchList(0, 1000)
    } else {
      await pagination.load()
    }
    lastUpdated.markUpdated()
  }, 'Failed to load RTSP connections')
}

useSearchableList(search, () => loadData())

const exportCsvData = () => {
  exportCsv(
    `rtsp-connections-${new Date().toISOString().slice(0, 10)}.csv`,
    ['ID', 'Remote Address', 'Tunnel', 'Inbound', 'Outbound', 'Created'],
    filteredList.value.map(c => [
      c.id,
      c.remoteAddr || '',
      c.tunnel || '',
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
