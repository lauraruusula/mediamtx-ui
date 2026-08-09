<template>
  <div>
    <div class="page-header">
      <h1>
        SRT Connections <el-tag size="small" round>{{ store.itemCount }}</el-tag>
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
    <p class="page-subtitle">Active SRT publish and playback connections.</p>
    <el-card shadow="hover">
      <el-table v-loading="store.loading" :data="filteredList" style="width: 100%">
        <el-table-column prop="id" label="ID" width="280" show-overflow-tooltip />
        <el-table-column label="Status" width="80">
          <template #default="{ row }">
            <el-tag
              :type="row.state === 'publish' ? 'danger' : row.state === 'read' ? 'success' : 'info'"
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
        <el-table-column
          label="Packets Sent"
          width="140"
          align="center"
          sortable
          prop="packetsSent"
        >
          <template #default="{ row }">{{ row.packetsSent || 0 }}</template>
        </el-table-column>
        <el-table-column
          label="Packets Received"
          width="165"
          align="center"
          sortable
          prop="packetsReceived"
        >
          <template #default="{ row }">{{ row.packetsReceived || 0 }}</template>
        </el-table-column>
        <el-table-column label="RTT (ms)" width="100" align="center" sortable prop="msRTT">
          <template #default="{ row }">{{ row.msRTT?.toFixed(1) || '-' }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="90" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
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
        v-if="!store.loading && filteredList.length === 0"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSrtConnStore } from '@/stores/srtConn'
import { useActivityStore } from '@/stores/activity'
import { usePagination } from '@/composables/usePagination'
import { useAutoRefresh, AUTO_REFRESH_INTERVAL_MS } from '@/composables/useAutoRefresh'
import { useSearchableList, filterList } from '@/composables/useSearchableList'
import { useLastUpdated } from '@/composables/useLastUpdated'
import { formatState } from '@/composables/useFormatters'
import { ElMessage } from 'element-plus'
import { Refresh, Search, SwitchButton } from '@element-plus/icons-vue'
import { getErrorMessage } from '@/composables/useErrorMessage'
import PathLink from '@/components/PathLink.vue'
import type { APISRTConn } from '@/types/api'

const AUTO_REFRESH_INTERVAL_S = AUTO_REFRESH_INTERVAL_MS / 1000

const store = useSrtConnStore()
const activityStore = useActivityStore()
const pagination = usePagination((page, itemsPerPage) => store.fetchList(page, itemsPerPage))
const lastUpdated = useLastUpdated()
const search = ref('')

const filteredList = computed(() =>
  filterList(
    store.list,
    search.value,
    (c: APISRTConn) => c.id + ' ' + (c.path || '') + ' ' + (c.remoteAddr || '')
  )
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

const handleKick = async (id: string) => {
  try {
    await store.kick(id)
    ElMessage.success('Connection kicked')
    activityStore.log(`Kicked an SRT connection (${id.slice(0, 8)}…)`, 'error')
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Failed to kick connection'))
  }
}

const autoRefreshCtrl = useAutoRefresh(loadData)
onMounted(() => {
  loadData().catch(() => {})
})
</script>
