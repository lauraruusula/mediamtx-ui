<template>
  <div>
    <div class="page-header">
      <h1>
        Recordings <el-tag size="small" round>{{ store.itemCount }}</el-tag>
      </h1>
      <div class="page-actions">
        <el-input
          v-model="search"
          placeholder="Search recordings"
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
    <p class="page-subtitle">Browse and manage recorded segments for each path.</p>
    <el-card shadow="hover">
      <el-table v-loading="store.loading" :data="filteredList" style="width: 100%">
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
                  @click="showDetail(row as APIRecording)"
                />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!store.loading && filteredList.length === 0"
        :description="search ? `No recordings match “${search}”` : 'No recordings yet'"
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

    <el-drawer v-model="drawerVisible" :title="currentRecording?.name" size="440px">
      <template v-if="currentRecording">
        <h4 style="margin-bottom: 4px">Segments ({{ currentRecording.segments?.length || 0 }})</h4>
        <p class="drawer-hint">
          Playback uses MediaMTX's playback server (default port 9996). Enable it with
          <code>playback: yes</code> in mediamtx.yml if links don't load.
        </p>
        <el-table :data="pagedSegments" style="width: 100%">
          <el-table-column label="Start Time" sortable>
            <template #default="{ row }">{{ formatDate(row.start) }}</template>
          </el-table-column>
          <el-table-column label="Actions" width="120" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-tooltip content="Play segment" placement="top">
                  <el-button
                    :icon="VideoPlay"
                    circle
                    size="small"
                    type="success"
                    plain
                    aria-label="Play segment"
                    @click="playSegment(row.start)"
                  />
                </el-tooltip>
                <el-tooltip content="Open / download segment" placement="top">
                  <el-button
                    :icon="Download"
                    circle
                    size="small"
                    plain
                    tag="a"
                    :href="segmentUrl(row.start)"
                    target="_blank"
                    rel="noopener noreferrer"
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
        <div v-if="(currentRecording?.segments?.length || 0) > segPageSize" class="pagination-bar">
          <el-pagination
            v-model:current-page="segPage"
            background
            layout="total, prev, pager, next"
            :total="currentRecording?.segments?.length || 0"
            :page-size="segPageSize"
          />
        </div>
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
        <a :href="playingUrl" target="_blank" rel="noopener noreferrer">opening the link directly</a
        >.
      </p>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRecordingsStore } from '@/stores/recordings'
import { useActivityStore } from '@/stores/activity'
import { usePagination } from '@/composables/usePagination'
import { useAutoRefresh, AUTO_REFRESH_INTERVAL_MS } from '@/composables/useAutoRefresh'
import { useSearchableList, filterList } from '@/composables/useSearchableList'
import { useLastUpdated } from '@/composables/useLastUpdated'
import { formatDate } from '@/composables/useFormatters'
import { buildPlaybackUrl } from '@/composables/useRecordingPlayback'
import { ElMessage } from 'element-plus'
import { Refresh, Search, View, VideoPlay, Download, Delete } from '@element-plus/icons-vue'
import { getErrorMessage } from '@/composables/useErrorMessage'
import type { APIRecording } from '@/types/api'

const AUTO_REFRESH_INTERVAL_S = AUTO_REFRESH_INTERVAL_MS / 1000
const SEG_PAGE_SIZE = 20

const store = useRecordingsStore()
const activityStore = useActivityStore()
const drawerVisible = ref(false)
const currentRecording = ref<APIRecording | null>(null)
const playerVisible = ref(false)
const playingUrl = ref('')
const search = ref('')
const segPage = ref(1)
const segPageSize = SEG_PAGE_SIZE

const filteredList = computed(() =>
  filterList(store.list, search.value, (r: APIRecording) => r.name)
)

// Segments table in the drawer is paginated client-side — recordings can have
// thousands of segments and the drawer must stay responsive.
const pagedSegments = computed(() => {
  const segments = currentRecording.value?.segments || []
  const start = (segPage.value - 1) * segPageSize
  return segments.slice(start, start + segPageSize)
})

const showDetail = (row: APIRecording) => {
  currentRecording.value = row
  segPage.value = 1
  drawerVisible.value = true
}

// Segments are looked up by their start timestamp, not a table index, so
// sorting or paging the segments table never misaligns play/download/delete.
const segmentIndex = (start: string) =>
  currentRecording.value?.segments?.findIndex(s => s.start === start) ?? -1

const segmentUrl = (start: string) => {
  const i = segmentIndex(start)
  if (i < 0 || !currentRecording.value?.segments) return ''
  return buildPlaybackUrl(currentRecording.value.name, currentRecording.value.segments, i)
}

const playSegment = (start: string) => {
  const url = segmentUrl(start)
  if (!url) return
  playingUrl.value = url
  playerVisible.value = true
}

const handleDeleteSegment = async (name: string, start: string) => {
  try {
    await store.deleteSegment(name, start)
    // Reload from the user's current page (the store no longer re-fetches)
    await loadData()
    ElMessage.success('Segment deleted')
    activityStore.log(`Deleted a recording segment from "${name}"`, 'success')
    // Reload details
    const updated = await store.fetchOne(name)
    currentRecording.value = updated
    // If the current page emptied, step back one page.
    const totalPages = Math.ceil((updated.segments?.length || 0) / segPageSize)
    if (segPage.value > totalPages && totalPages > 0) segPage.value = totalPages
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Failed to delete segment'))
  }
}

const pagination = usePagination((page, itemsPerPage) => store.fetchList(page, itemsPerPage))
const lastUpdated = useLastUpdated()

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
