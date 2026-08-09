<template>
  <div>
    <div class="page-header">
      <h1>Recordings</h1>
      <el-button :icon="Refresh" @click="loadData" :loading="store.loading">Refresh</el-button>
    </div>
    <el-card shadow="hover">
      <el-table :data="store.list" v-loading="store.loading" style="width: 100%">
        <el-table-column prop="name" label="Recording Name" min-width="200" show-overflow-tooltip />
        <el-table-column label="Segments" width="80" align="center">
          <template #default="{ row }">{{ row.segments?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="80">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="showDetail(row)">Details</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!store.loading && store.list.length === 0" description="No recordings" />
    </el-card>

    <el-drawer v-model="drawerVisible" :title="currentRecording?.name" size="400px">
      <template v-if="currentRecording">
        <h4 style="margin-bottom: 12px">Segments ({{ currentRecording.segments?.length || 0 }})</h4>
        <el-table :data="currentRecording.segments || []" style="width: 100%">
          <el-table-column label="Start Time">
            <template #default="{ row }">{{ formatDate(row.start) }}</template>
          </el-table-column>
          <el-table-column label="Actions" width="80">
            <template #default="{ row }">
              <el-popconfirm title="Delete this segment?" @confirm="handleDeleteSegment(currentRecording!.name, row.start)">
                <template #reference>
                  <el-button text type="danger" size="small">Delete</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRecordingsStore } from '@/stores/recordings'
import { formatDate } from '@/composables/useFormatters'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import type { APIRecording } from '@/types/api'

const store = useRecordingsStore()
const drawerVisible = ref(false)
const currentRecording = ref<APIRecording | null>(null)

const showDetail = (row: APIRecording) => {
  currentRecording.value = row
  drawerVisible.value = true
}

const handleDeleteSegment = async (name: string, start: string) => {
  try {
    await store.deleteSegment(name, start)
    ElMessage.success('Deleted')
    // Reload details
    const updated = await store.fetchOne(name)
    currentRecording.value = updated
  } catch {
    ElMessage.error('Failed to delete')
  }
}

const loadData = () => store.fetchList()
onMounted(loadData)
</script>
