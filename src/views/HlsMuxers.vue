<template>
  <div>
    <div class="page-header">
      <h1>HLS Muxers <el-tag size="small" round>{{ store.itemCount }}</el-tag></h1>
      <div class="page-actions">
        <el-switch v-model="autoRefreshCtrl.active.value" active-text="Auto refresh" @change="autoRefreshCtrl.toggle" />
        <el-button :icon="Refresh" @click="loadData" :loading="store.loading">Refresh</el-button>
      </div>
    </div>
    <el-card shadow="hover">
      <el-table :data="store.list" v-loading="store.loading" style="width: 100%">
        <el-table-column prop="path" label="Path" min-width="200" show-overflow-tooltip />
        <el-table-column label="Outbound Traffic" width="120">
          <template #default="{ row }">{{ formatBytes(row.outboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column label="Dropped Frames" width="100" align="center">
          <template #default="{ row }">{{ row.outboundFramesDiscarded || 0 }}</template>
        </el-table-column>
        <el-table-column label="Created" width="170">
          <template #default="{ row }">{{ formatDate(row.created) }}</template>
        </el-table-column>
        <el-table-column label="Last Request" width="170">
          <template #default="{ row }">{{ formatDate(row.lastRequest) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!store.loading && store.list.length === 0" description="No HLS muxers" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useHlsMuxerStore } from '@/stores/hlsMuxer'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { formatBytes, formatDate } from '@/composables/useFormatters'
import { Refresh } from '@element-plus/icons-vue'

const store = useHlsMuxerStore()
const loadData = () => store.fetchList()
const autoRefreshCtrl = useAutoRefresh(loadData)
onMounted(loadData)
</script>
