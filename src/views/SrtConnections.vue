<template>
  <div>
    <div class="page-header">
      <h1>SRT Connections <el-tag size="small" round>{{ store.itemCount }}</el-tag></h1>
      <div class="page-actions">
        <el-switch v-model="autoRefreshCtrl.active.value" active-text="Auto refresh" @change="autoRefreshCtrl.toggle" />
        <el-button :icon="Refresh" @click="loadData" :loading="store.loading">Refresh</el-button>
      </div>
    </div>
    <el-card shadow="hover">
      <el-table :data="store.list" v-loading="store.loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="280" show-overflow-tooltip />
        <el-table-column label="Status" width="80">
          <template #default="{ row }">
            <el-tag :type="row.state === 'publish' ? 'danger' : row.state === 'read' ? 'success' : 'info'" size="small">
              {{ formatState(row.state) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="Path" min-width="150" show-overflow-tooltip />
        <el-table-column prop="remoteAddr" label="Remote Address" width="160" />
        <el-table-column label="Packets Sent" width="100" align="center">
          <template #default="{ row }">{{ row.packetsSent || 0 }}</template>
        </el-table-column>
        <el-table-column label="Packets Received" width="100" align="center">
          <template #default="{ row }">{{ row.packetsReceived || 0 }}</template>
        </el-table-column>
        <el-table-column label="RTT (ms)" width="90" align="center">
          <template #default="{ row }">{{ row.msRTT?.toFixed(1) || '-' }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="80" fixed="right">
          <template #default="{ row }">
            <el-popconfirm title="Kick this connection?" @confirm="handleKick(row.id)">
              <template #reference>
                <el-button text type="danger" size="small">Kick</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!store.loading && store.list.length === 0" description="No SRT connections" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSrtConnStore } from '@/stores/srtConn'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { formatState } from '@/composables/useFormatters'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const store = useSrtConnStore()
const loadData = () => store.fetchList()
const autoRefreshCtrl = useAutoRefresh(loadData)

const handleKick = async (id: string) => {
  try {
    await store.kick(id)
    ElMessage.success('Kicked')
  } catch {
    ElMessage.error('Failed to kick')
  }
}

onMounted(loadData)
</script>
