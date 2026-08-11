<template>
  <div>
    <div class="page-header">
      <h1>
        HLS Muxers <el-tag size="small" round>{{ store.itemCount }}</el-tag>
      </h1>
      <div class="page-actions">
        <el-input
          v-model="search"
          placeholder="Search muxers"
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
    <p class="page-subtitle">HLS output muxers currently serving segments. Read-only.</p>
    <ApiErrorBanner :message="error" :loading="store.loading" @retry="loadData" />

    <el-card shadow="hover">
      <el-table
        v-loading="store.loading"
        :data="filteredList"
        style="width: 100%"
        :default-sort="sort.defaultSort"
        @sort-change="sort.onSortChange"
      >
        <el-table-column label="Path" min-width="200" show-overflow-tooltip>
          <template #default="{ row }"><PathLink :path="row.path" /></template>
        </el-table-column>
        <el-table-column label="Outbound Traffic" width="180" sortable prop="outboundBytes">
          <template #default="{ row }">{{ formatBytes(row.outboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column
          label="Dropped Frames"
          width="155"
          align="center"
          sortable
          prop="outboundFramesDiscarded"
        >
          <template #default="{ row }">{{ row.outboundFramesDiscarded || 0 }}</template>
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
        <el-table-column
          label="Last Request"
          width="170"
          sortable
          :sort-method="
            (a: any, b: any) =>
              (new Date(a.lastRequest).getTime() || 0) - (new Date(b.lastRequest).getTime() || 0)
          "
        >
          <template #default="{ row }">{{ formatDate(row.lastRequest) }}</template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!store.loading && filteredList.length === 0"
        :description="search ? `No muxers match “${search}”` : 'No HLS muxers yet'"
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
import { useHlsMuxerStore } from '@/stores/hlsMuxer'
import { usePagination } from '@/composables/usePagination'
import { useAutoRefresh, AUTO_REFRESH_INTERVAL_MS } from '@/composables/useAutoRefresh'
import { useSearchableList, filterList } from '@/composables/useSearchableList'
import { useLastUpdated } from '@/composables/useLastUpdated'
import { useListError } from '@/composables/useListError'
import { useTableSort } from '@/composables/useTableSort'
import { exportCsv } from '@/composables/useCsvExport'
import { formatBytes, formatDate } from '@/composables/useFormatters'
import { Refresh, Search, Download } from '@element-plus/icons-vue'
import PathLink from '@/components/PathLink.vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import type { APIHLSMuxer } from '@/types/api'

const AUTO_REFRESH_INTERVAL_S = AUTO_REFRESH_INTERVAL_MS / 1000

const store = useHlsMuxerStore()
const pagination = usePagination(
  (page, itemsPerPage) => store.fetchList(page, itemsPerPage),
  20,
  'pagesize:hls-muxers'
)
const lastUpdated = useLastUpdated()
const search = ref('')
const { error, run } = useListError()
const sort = useTableSort('sort:hls-muxers')

const filteredList = computed(() =>
  filterList(store.list, search.value, (m: APIHLSMuxer) => m.path || '')
)

const loadData = async () => {
  await run(async () => {
    if (search.value.trim()) {
      await store.fetchList(0, 1000)
    } else {
      await pagination.load()
    }
    lastUpdated.markUpdated()
  }, 'Failed to load HLS muxers')
}

useSearchableList(search, () => loadData())

const exportCsvData = () => {
  exportCsv(
    `hls-muxers-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Path', 'Outbound Traffic', 'Dropped Frames', 'Created', 'Last Request'],
    filteredList.value.map(m => [
      m.path || '',
      m.outboundBytes || 0,
      m.outboundFramesDiscarded || 0,
      formatDate(m.created),
      formatDate(m.lastRequest)
    ])
  )
}

const autoRefreshCtrl = useAutoRefresh(loadData, AUTO_REFRESH_INTERVAL_MS, 'autorefresh:hls-muxers')
onMounted(() => {
  loadData()
})
</script>
