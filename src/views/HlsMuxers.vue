<template>
  <div>
    <div class="page-header">
      <h1>
        HLS Muxers <el-tag size="small" round>{{ displayedCount }}</el-tag>
      </h1>
      <div v-if="!protocolDisabled" class="page-actions">
        <el-input
          v-model="search"
          placeholder="Search muxers"
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
    <p class="page-subtitle">HLS output muxers currently serving segments. Read-only.</p>
    <ProtocolDisabled
      v-if="protocolDisabled"
      protocol="HLS"
      feature-label="muxers"
      tab-name="hls"
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
          <el-table-column label="Path" min-width="200" show-overflow-tooltip>
            <template #default="{ row }"><PathLink :path="row.path" /></template>
          </el-table-column>
          <el-table-column label="Health" width="120">
            <template #default="{ row }">
              <HealthBadge :info="discardedFramesHealth(row.outboundFramesDiscarded)" />
            </template>
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
          v-if="!error && !initialLoading && filteredList.length === 0"
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useHlsMuxerStore } from '@/stores/hlsMuxer'
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
import { discardedFramesHealth } from '@/composables/useStreamHealth'
import { Refresh, Search, Download } from '@element-plus/icons-vue'
import PathLink from '@/components/PathLink.vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import ProtocolDisabled from '@/components/ProtocolDisabled.vue'
import HealthBadge from '@/components/HealthBadge.vue'
import type { APIHLSMuxer } from '@/types/api'

const store = useHlsMuxerStore()
// The server 404s /v3/hlsmuxers/* when HLS is disabled, so we skip the fetch
// and show a friendly explanation instead of the raw API error.
const { disabled: protocolDisabled, guard } = useProtocolGuard('hls')
const pagination = usePagination(
  (page, itemsPerPage) => store.fetchList(page, itemsPerPage),
  20,
  'pagesize:hls-muxers'
)
const lastUpdated = useLastUpdated()
const search = ref('')
// The loading mask is only meaningful while the table has nothing to render —
// showing it on every auto-refresh tick makes the panel flash. Once the first
// fetch lands, refreshes update rows in place and the refresh button's own
// spinner covers the loading state.
const initialLoading = ref(true)
const { error, run } = useListError()
const sort = useTableSort('sort:hls-muxers')

const filteredList = computed(() =>
  filterList(store.list, search.value, (m: APIHLSMuxer) => m.path || '')
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
  }, 'Failed to load HLS muxers')
}

useSearchableList(search, () => loadData())

const exportCsvData = () => {
  exportCsv(
    `hls-muxers-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Path', 'Health', 'Outbound Traffic', 'Dropped Frames', 'Created', 'Last Request'],
    filteredList.value.map(m => [
      m.path || '',
      discardedFramesHealth(m.outboundFramesDiscarded).label,
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
