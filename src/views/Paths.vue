<template>
  <div>
    <div class="page-header">
      <h1>Path Status</h1>
      <div class="page-actions">
        <el-input v-model="search" placeholder="Search paths" clearable style="width: 200px" :prefix-icon="Search" />
        <el-button :icon="Refresh" @click="loadData" :loading="store.loading">Refresh</el-button>
      </div>
    </div>

    <el-card shadow="hover">
      <el-table :data="filteredList" v-loading="store.loading" style="width: 100%">
        <el-table-column prop="name" label="Path Name" min-width="180" show-overflow-tooltip />
        <el-table-column label="Status" width="90">
          <template #default="{ row }">
            <el-tag :type="row.online ? 'success' : row.available ? 'warning' : 'info'" size="small">
              {{ row.online ? 'Online' : row.available ? 'Available' : 'Offline' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Source Type" width="130">
          <template #default="{ row }">
            {{ row.source ? formatSourceType(row.source.type) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="Tracks" width="80" align="center">
          <template #default="{ row }">{{ row.tracks2?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="Readers" width="80" align="center">
          <template #default="{ row }">{{ row.readers?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="Inbound" width="110">
          <template #default="{ row }">{{ formatBytes(row.inboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column label="Outbound" width="110">
          <template #default="{ row }">{{ formatBytes(row.outboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="130" fixed="right">
          <template #default="{ row }">
            <el-button text type="success" size="small" :disabled="!row.online" @click="openPlayer(row)">Play</el-button>
            <el-button text type="primary" size="small" @click="showDetail(row)">Details</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!store.loading && filteredList.length === 0" description="No paths" />
    </el-card>

    <el-drawer v-model="drawerVisible" :title="currentPath?.name" size="450px">
      <el-descriptions :column="1" border v-if="currentPath">
        <el-descriptions-item label="Path Name">{{ currentPath.name }}</el-descriptions-item>
        <el-descriptions-item label="Config Name">{{ currentPath.confName }}</el-descriptions-item>
        <el-descriptions-item label="Online">
          <el-tag :type="currentPath.online ? 'success' : 'info'" size="small">
            {{ currentPath.online ? 'Yes' : 'No' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Source Type">
          {{ currentPath.source ? formatSourceType(currentPath.source.type) : 'None' }}
        </el-descriptions-item>
        <el-descriptions-item label="Inbound Traffic">{{ formatBytes(currentPath.inboundBytes || 0) }}</el-descriptions-item>
        <el-descriptions-item label="Outbound Traffic">{{ formatBytes(currentPath.outboundBytes || 0) }}</el-descriptions-item>
      </el-descriptions>
      <template v-if="currentPath?.tracks2?.length">
        <h4 style="margin: 16px 0 8px">Tracks</h4>
        <el-tag v-for="(t, i) in currentPath.tracks2" :key="i" style="margin: 0 4px 4px 0">{{ t.codec }}</el-tag>
      </template>
      <template v-if="currentPath?.readers?.length">
        <h4 style="margin: 16px 0 8px">Readers</h4>
        <el-tag v-for="(r, i) in currentPath.readers" :key="i" type="success" style="margin: 0 4px 4px 0">{{ r.type }}</el-tag>
      </template>
    </el-drawer>

    <!-- Player Dialog -->
    <el-dialog
      v-model="playerVisible"
      :title="`Play - ${playingPath}`"
      width="720px"
      destroy-on-close
      align-center
    >
      <StreamPlayer v-if="playerVisible" :pathName="playingPath" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePathsStore } from '@/stores/paths'
import { formatBytes, formatSourceType } from '@/composables/useFormatters'
import { Refresh, Search } from '@element-plus/icons-vue'
import StreamPlayer from '@/components/StreamPlayer.vue'
import type { APIPath } from '@/types/api'

const store = usePathsStore()
const search = ref('')
const drawerVisible = ref(false)
const currentPath = ref<APIPath | null>(null)
const playerVisible = ref(false)
const playingPath = ref('')

const filteredList = computed(() => {
  if (!search.value) return store.list
  const s = search.value.toLowerCase()
  return store.list.filter(p => p.name.toLowerCase().includes(s))
})

const showDetail = (row: APIPath) => {
  currentPath.value = row
  drawerVisible.value = true
}

const openPlayer = (row: APIPath) => {
  playingPath.value = row.name
  playerVisible.value = true
}

const loadData = () => store.fetchList()
onMounted(loadData)
</script>
