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
        <el-button :icon="Refresh" :loading="store.loading" @click="loadData">Refresh</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      Raw TCP-level RTSP connections. Read-only — see RTSP Sessions to disconnect a client.
    </p>
    <el-card shadow="hover">
      <el-table v-loading="store.loading" :data="filteredList" style="width: 100%">
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
import { formatBytes, formatDate } from '@/composables/useFormatters'
import { Refresh, Search } from '@element-plus/icons-vue'
import type { APIRTSPConn } from '@/types/api'

const AUTO_REFRESH_INTERVAL_S = AUTO_REFRESH_INTERVAL_MS / 1000

const store = useRtspConnStore()
const pagination = usePagination((page, itemsPerPage) => store.fetchList(page, itemsPerPage))
const lastUpdated = useLastUpdated()
const search = ref('')

const filteredList = computed(() =>
  filterList(store.list, search.value, (c: APIRTSPConn) => c.id + ' ' + (c.remoteAddr || ''))
)

const loadData = async () => {
  if (search.value.trim()) {
    await store.fetchList(0, 1000)
  } else {
    await pagination.load()
  }
  lastUpdated.markUpdated()
}

useSearchableList(search, () => loadData().catch(() => {}))
const autoRefreshCtrl = useAutoRefresh(loadData)
onMounted(() => {
  loadData().catch(() => {})
})
</script>
