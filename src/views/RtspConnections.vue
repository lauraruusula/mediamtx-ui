<template>
  <div>
    <div class="page-header">
      <h1>
        RTSP Connections <el-tag size="small" round>{{ store.itemCount }}</el-tag>
      </h1>
      <div class="page-actions">
        <el-switch
          v-model="autoRefreshCtrl.active.value"
          active-text="Auto refresh (5s)"
          @change="autoRefreshCtrl.toggle"
        />
        <el-button :icon="Refresh" :loading="store.loading" @click="loadData">Refresh</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      Raw TCP-level RTSP connections. Read-only — see RTSP Sessions to disconnect a client.
    </p>
    <el-card shadow="hover">
      <el-table v-loading="store.loading" :data="store.list" style="width: 100%">
        <el-table-column prop="id" label="ID" width="280" show-overflow-tooltip />
        <el-table-column label="Remote Address" prop="remoteAddr" min-width="160" />
        <el-table-column label="Tunnel" prop="tunnel" width="100" />
        <el-table-column label="Inbound" width="110" sortable prop="inboundBytes">
          <template #default="{ row }">{{ formatBytes(row.inboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column label="Outbound" width="110" sortable prop="outboundBytes">
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
        v-if="!store.loading && store.list.length === 0"
        description="No RTSP connections yet"
      />
      <div v-if="store.itemCount > 0" class="pagination-bar">
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
import { onMounted } from 'vue'
import { useRtspConnStore } from '@/stores/rtspConn'
import { usePagination } from '@/composables/usePagination'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { formatBytes, formatDate } from '@/composables/useFormatters'
import { Refresh } from '@element-plus/icons-vue'

const store = useRtspConnStore()
const pagination = usePagination((page, itemsPerPage) => store.fetchList(page, itemsPerPage))
const loadData = () => pagination.load()
const autoRefreshCtrl = useAutoRefresh(loadData)
onMounted(loadData)
</script>
