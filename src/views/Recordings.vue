<template>
  <div>
    <div class="page-header">
      <h1>
        Recordings <el-tag size="small" round>{{ store.itemCount }}</el-tag>
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
    <p class="page-subtitle">Browse and manage recorded segments for each path.</p>
    <el-card shadow="hover">
      <el-table v-loading="store.loading" :data="store.list" style="width: 100%">
        <el-table-column prop="name" label="Recording Name" min-width="200" show-overflow-tooltip />
        <el-table-column label="Segments" width="115" align="center" sortable>
          <template #default="{ row }">{{ row.segments?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="90" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-tooltip content="View segments" placement="top">
                <el-button
                  :icon="View"
                  circle
                  size="small"
                  type="primary"
                  plain
                  aria-label="View segments"
                  @click="showDetail(row)"
                />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!store.loading && store.list.length === 0" description="No recordings yet" />
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

    <el-drawer v-model="drawerVisible" :title="currentRecording?.name" size="440px">
      <template v-if="currentRecording">
        <h4 style="margin-bottom: 4px">Segments ({{ currentRecording.segments?.length || 0 }})</h4>
        <p class="drawer-hint">
          Playback uses MediaMTX's playback server (default port 9996). Enable it with
          <code>playback: yes</code> in mediamtx.yml if links don't load.
        </p>
        <el-table :data="currentRecording.segments || []" style="width: 100%">
          <el-table-column label="Start Time" sortable>
            <template #default="{ row }">{{ formatDate(row.start) }}</template>
          </el-table-column>
          <el-table-column label="Actions" width="120" fixed="right">
            <template #default="{ row, $index }">
              <div class="row-actions">
                <el-tooltip content="Play segment" placement="top">
                  <el-button
                    :icon="VideoPlay"
                    circle
                    size="small"
                    type="success"
                    plain
                    aria-label="Play segment"
                    @click="playSegment($index)"
                  />
                </el-tooltip>
                <el-tooltip content="Open / download segment" placement="top">
                  <el-button
                    :icon="Download"
                    circle
                    size="small"
                    plain
                    tag="a"
                    :href="segmentUrl($index)"
                    target="_blank"
                    rel="noopener"
                    aria-label="Open or download segment"
                  />
                </el-tooltip>
                <el-popconfirm
                  title="Delete this segment? This cannot be undone."
                  @confirm="handleDeleteSegment(currentRecording!.name, row.start)"
                >
                  <template #reference>
                    <el-button
                      :icon="Delete"
                      circle
                      size="small"
                      type="danger"
                      plain
                      title="Delete segment"
                      aria-label="Delete segment"
                    />
                  </template>
                </el-popconfirm>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-drawer>

    <!-- Segment playback dialog -->
    <el-dialog v-model="playerVisible" title="Segment playback" width="720px" destroy-on-close>
      <video
        v-if="playingUrl"
        controls
        autoplay
        :src="playingUrl"
        style="width: 100%; border-radius: var(--radius-md); background: #000"
      />
      <p class="drawer-hint" style="margin-top: 10px; margin-bottom: 0">
        If playback fails, the MediaMTX playback server may not be enabled, or this segment's
        estimated duration didn't match — try
        <a :href="playingUrl" target="_blank" rel="noopener">opening the link directly</a>.
      </p>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRecordingsStore } from '@/stores/recordings'
import { useActivityStore } from '@/stores/activity'
import { usePagination } from '@/composables/usePagination'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { formatDate } from '@/composables/useFormatters'
import { buildPlaybackUrl } from '@/composables/useRecordingPlayback'
import { ElMessage } from 'element-plus'
import { Refresh, View, VideoPlay, Download, Delete } from '@element-plus/icons-vue'
import { getErrorMessage } from '@/composables/useErrorMessage'
import type { APIRecording } from '@/types/api'

const store = useRecordingsStore()
const activityStore = useActivityStore()
const drawerVisible = ref(false)
const currentRecording = ref<APIRecording | null>(null)
const playerVisible = ref(false)
const playingUrl = ref('')

const showDetail = (row: APIRecording) => {
  currentRecording.value = row
  drawerVisible.value = true
}

const segmentUrl = (index: number) => {
  if (!currentRecording.value?.segments) return ''
  return buildPlaybackUrl(currentRecording.value.name, currentRecording.value.segments, index)
}

const playSegment = (index: number) => {
  playingUrl.value = segmentUrl(index)
  playerVisible.value = true
}

const handleDeleteSegment = async (name: string, start: string) => {
  try {
    await store.deleteSegment(name, start)
    ElMessage.success('Segment deleted')
    activityStore.log(`Deleted a recording segment from "${name}"`, 'success')
    // Reload details
    const updated = await store.fetchOne(name)
    currentRecording.value = updated
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Failed to delete segment'))
  }
}

const pagination = usePagination((page, itemsPerPage) => store.fetchList(page, itemsPerPage))
const loadData = () => pagination.load()
const autoRefreshCtrl = useAutoRefresh(loadData)
onMounted(loadData)
</script>

<style scoped>
.drawer-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}

.drawer-hint code {
  background: var(--el-fill-color-light);
  padding: 1px 4px;
  border-radius: 4px;
}

.drawer-hint a {
  color: var(--el-color-primary);
}
</style>
