<template>
  <div>
    <div class="page-header">
      <h1>
        HLS Muxers <el-tag size="small" round>{{ store.itemCount }}</el-tag>
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
    <p class="page-subtitle">HLS output muxers currently serving segments. Read-only.</p>
    <el-card shadow="hover">
      <el-table v-loading="store.loading" :data="store.list" style="width: 100%">
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
            (a: any, b: any) => new Date(a.created).getTime() - new Date(b.created).getTime()
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
              new Date(a.lastRequest).getTime() - new Date(b.lastRequest).getTime()
          "
        >
          <template #default="{ row }">{{ formatDate(row.lastRequest) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!store.loading && store.list.length === 0" description="No HLS muxers yet" />
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
import { useHlsMuxerStore } from '@/stores/hlsMuxer'
import { usePagination } from '@/composables/usePagination'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { formatBytes, formatDate } from '@/composables/useFormatters'
import { Refresh } from '@element-plus/icons-vue'
import PathLink from '@/components/PathLink.vue'

const store = useHlsMuxerStore()
const pagination = usePagination((page, itemsPerPage) => store.fetchList(page, itemsPerPage))
const loadData = () => pagination.load()
const autoRefreshCtrl = useAutoRefresh(loadData)
onMounted(loadData)
</script>
