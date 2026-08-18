<template>
  <div>
    <div class="page-header">
      <h1>
        Recordings <el-tag size="small" round>{{ displayedCount }}</el-tag>
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
          :active-text="'Auto refresh'"
          @change="autoRefreshCtrl.toggle"
        />
        <el-select
          :model-value="autoRefreshCtrl.interval.value"
          class="interval-select"
          aria-label="Auto refresh interval"
          @change="autoRefreshCtrl.setIntervalMs"
        >
          <el-option
            v-for="ms in AUTO_REFRESH_INTERVAL_OPTIONS_MS"
            :key="ms"
            :label="`${ms / 1000}s`"
            :value="ms"
          />
        </el-select>
        <span v-if="lastUpdated.label" class="updated-hint">{{ lastUpdated.label }}</span>
        <el-button :icon="Download" @click="exportCsvData">Export</el-button>
        <el-button :icon="Refresh" :loading="store.loading" @click="loadData(true)"
          >Refresh</el-button
        >
      </div>
    </div>
    <p class="page-subtitle">Browse and manage recorded segments for each path.</p>
    <ApiErrorBanner :message="error" :loading="store.loading" @retry="loadData(true)" />

    <el-card shadow="never">
      <el-table
        v-loading="initialLoading"
        :data="filteredList"
        style="width: 100%"
        :default-sort="sort.defaultSort"
        @sort-change="sort.onSortChange"
      >
        <el-table-column prop="name" label="Recording Name" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <PathLink :path="row.name" />
          </template>
        </el-table-column>
        <el-table-column
          label="Segments"
          width="115"
          align="center"
          sortable
          :sort-method="compareSegmentCount"
        >
          <template #default="{ row }">{{ row.segments?.length || 0 }}</template>
        </el-table-column>
        <el-table-column
          label="Total Duration"
          width="140"
          sortable
          :sort-method="compareTotalDuration"
        >
          <template #default="{ row }">
            {{ formatDuration(recordingTotalDurationSeconds(row.segments || [])) }}
          </template>
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
        v-if="!error && !initialLoading && filteredList.length === 0"
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

    <el-drawer v-model="drawerVisible" size="440px">
      <template #header>
        <div class="drawer-header">
          <div class="drawer-title-wrap">
            <span class="drawer-title">{{ currentRecording?.name }}</span>
            <span v-if="currentRecording" class="drawer-total">
              {{ currentRecording.segments?.length || 0 }} segments ·
              {{ formatDuration(recordingTotalDurationSeconds(currentRecording.segments || [])) }}
            </span>
          </div>
          <div class="drawer-actions">
            <el-tooltip content="Copy full playback URL" placement="top">
              <el-button
                :icon="CopyDocument"
                circle
                size="small"
                aria-label="Copy full playback URL"
                @click="copyRecordingUrl"
              />
            </el-tooltip>
            <el-button
              :icon="Refresh"
              circle
              size="small"
              :loading="refreshingRecording"
              aria-label="Refresh recording"
              @click="refreshRecording"
            />
          </div>
        </div>
      </template>
      <template v-if="currentRecording">
        <h4 style="margin-bottom: 4px">
          Segments ({{ filteredSegments.length }})<span
            v-if="segDateRange"
            class="segments-filtered-hint"
            >filtered</span
          >
        </h4>
        <p class="drawer-hint">
          Playback uses MediaMTX's built-in playback server. If links don't load, make sure Playback
          is enabled in
          <router-link to="/config?tab=playback">System Config</router-link>.
        </p>
        <el-date-picker
          v-model="segDateRange"
          type="daterange"
          range-separator="–"
          start-placeholder="From"
          end-placeholder="To"
          size="small"
          style="width: 100%; margin-bottom: 12px"
          clearable
          @change="segPage = 1"
        />
        <el-table
          :data="pagedSegments"
          style="width: 100%"
          :default-sort="segSort.defaultSort"
          @sort-change="segSort.onSortChange"
        >
          <el-table-column prop="start" label="Start Time" sortable>
            <template #default="{ row }">{{ formatDate(row.start) }}</template>
          </el-table-column>
          <el-table-column label="Duration" width="100" sortable prop="duration">
            <template #default="{ row }">{{ formatDuration(row.duration) }}</template>
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
        <div v-if="filteredSegments.length > segPageSize" class="pagination-bar">
          <el-pagination
            v-model:current-page="segPage"
            background
            layout="total, prev, pager, next"
            :total="filteredSegments.length"
            :page-size="segPageSize"
          />
        </div>
      </template>
    </el-drawer>

    <!-- Segment playback dialog -->
    <el-dialog v-model="playerVisible" :title="playingTitle" width="720px" destroy-on-close>
      <HlsPlayer v-if="playingUrl" :src="playingUrl" :title="playingTitle" />
      <p class="drawer-hint" style="margin-top: 10px; margin-bottom: 0">
        If playback fails, the MediaMTX playback server may not be enabled, or this segment's
        duration is unknown — try
        <a :href="playingUrl" target="_blank" rel="noopener noreferrer">opening the link directly</a
        >.
      </p>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRecordingsStore } from '@/stores/recordings'
import { useActivityStore } from '@/stores/activity'
import { useConfigStore } from '@/stores/config'
import { usePagination } from '@/composables/usePagination'
import {
  useAutoRefresh,
  AUTO_REFRESH_INTERVAL_MS,
  AUTO_REFRESH_INTERVAL_OPTIONS_MS
} from '@/composables/useAutoRefresh'
import { useSearchableList, filterList } from '@/composables/useSearchableList'
import { useLastUpdated } from '@/composables/useLastUpdated'
import { useListError } from '@/composables/useListError'
import { useTableSort } from '@/composables/useTableSort'
import { exportCsv } from '@/composables/useCsvExport'
import { formatDate, formatDuration } from '@/composables/useFormatters'
import {
  buildFullRecordingUrl,
  buildPlaybackUrl,
  recordingTotalDurationSeconds
} from '@/composables/useRecordingPlayback'
import { playbackPortFromConfig } from '@/composables/useStreamUrls'
import { copyToClipboard } from '@/composables/useClipboard'
import { toast } from '@/composables/useToast'
import {
  Refresh,
  Search,
  View,
  VideoPlay,
  Download,
  Delete,
  CopyDocument
} from '@element-plus/icons-vue'
import { getErrorMessage } from '@/composables/useErrorMessage'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import PathLink from '@/components/PathLink.vue'
import HlsPlayer from '@/components/HlsPlayer.vue'
import type { APIRecording } from '@/types/api'

const SEG_PAGE_SIZE = 20

const store = useRecordingsStore()
const activityStore = useActivityStore()
const configStore = useConfigStore()
const route = useRoute()
const drawerVisible = ref(false)
const currentRecording = ref<APIRecording | null>(null)
const refreshingRecording = ref(false)
const playerVisible = ref(false)
const playingUrl = ref('')
const playingTitle = ref('')
// Playback links use the live `playbackAddress` port so they point at the real
// server instead of a hard-coded 9996.
const playbackPort = ref(9996)
configStore
  .ensureLoaded()
  .then(cfg => {
    playbackPort.value = playbackPortFromConfig(cfg)
  })
  .catch(() => {})
// Prefilled when arriving via a "view this recording" link from the command
// palette (e.g. /recordings?q=name).
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const segPage = ref(1)
const segPageSize = SEG_PAGE_SIZE
const segDateRange = ref<[Date, Date] | null>(null)
// The loading mask is only meaningful while the table has nothing to render —
// showing it on every auto-refresh tick makes the panel flash. Once the first
// fetch lands, refreshes update rows in place and the refresh button's own
// spinner covers the loading state.
const initialLoading = ref(true)
const { error, run } = useListError()
const sort = useTableSort('sort:recordings')
const segSort = useTableSort('sort:recording-segments')

const filteredList = computed(() =>
  filterList(store.list, search.value, (r: APIRecording) => r.name)
)

// Sortable column for the segment count — the count isn't a row field, so it
// needs an explicit comparator (a `prop` alone would sort by row[undefined]).
const compareSegmentCount = (a: APIRecording, b: APIRecording) =>
  (a.segments?.length || 0) - (b.segments?.length || 0)

const compareTotalDuration = (a: APIRecording, b: APIRecording) =>
  recordingTotalDurationSeconds(a.segments || []) - recordingTotalDurationSeconds(b.segments || [])

// While searching, the badge reflects what's on screen rather than the server
// total (the list is fetched in full and filtered client-side).
const displayedCount = computed(() =>
  search.value.trim() ? filteredList.value.length : store.itemCount
)

// Date filter + client-side pagination for the segments table — recordings can
// have thousands of segments and the drawer must stay responsive.
const filteredSegments = computed(() => {
  const segments = currentRecording.value?.segments || []
  if (!segDateRange.value) return segments
  const [from, to] = segDateRange.value
  const fromMs = from.getTime()
  // Include the whole end day.
  const toMs = to.getTime() + 24 * 60 * 60 * 1000
  return segments.filter(s => {
    const t = new Date(s.start).getTime()
    return t >= fromMs && t <= toMs
  })
})

const pagedSegments = computed(() => {
  const start = (segPage.value - 1) * segPageSize
  return filteredSegments.value.slice(start, start + segPageSize)
})

const showDetail = (row: APIRecording) => {
  currentRecording.value = row
  segPage.value = 1
  segDateRange.value = null
  drawerVisible.value = true
}

// Segments are looked up by their start timestamp, not a table index, so
// sorting or paging the segments table never misaligns play/download/delete.
// The map is rebuilt once per recording (O(n) total) instead of scanning all
// segments for every row in the table on each render.
const segmentIndexMap = computed(() => {
  const map = new Map<string, number>()
  const segments = currentRecording.value?.segments || []
  for (let i = 0; i < segments.length; i++) map.set(segments[i].start, i)
  return map
})

const segmentIndex = (start: string) => segmentIndexMap.value.get(start) ?? -1

const segmentUrl = (start: string) => {
  const i = segmentIndex(start)
  if (i < 0 || !currentRecording.value?.segments) return ''
  return buildPlaybackUrl(
    currentRecording.value.name,
    currentRecording.value.segments,
    i,
    playbackPort.value
  )
}

const refreshRecording = async () => {
  if (!currentRecording.value) return
  refreshingRecording.value = true
  try {
    currentRecording.value = await store.fetchOne(currentRecording.value.name)
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to refresh recording'))
  } finally {
    refreshingRecording.value = false
  }
}

const playSegment = (start: string) => {
  const url = segmentUrl(start)
  if (!url) return
  playingUrl.value = url
  playingTitle.value = currentRecording.value?.name
    ? `${currentRecording.value.name} — segment ${formatDate(start)}`
    : 'Segment playback'
  playerVisible.value = true
}

const copyRecordingUrl = async () => {
  if (!currentRecording.value) return
  const url = buildFullRecordingUrl(
    currentRecording.value.name,
    currentRecording.value.segments || [],
    playbackPort.value
  )
  if (!url) {
    toast.error('Recording has no segments yet')
    return
  }
  const ok = await copyToClipboard(url)
  if (ok) toast.success('Playback URL copied')
  else toast.error('Failed to copy URL')
  activityStore.log(`Copied playback URL for "${currentRecording.value.name}"`, 'info')
}

const handleDeleteSegment = async (name: string, start: string) => {
  try {
    await store.deleteSegment(name, start)
    // Reload from the user's current page (the store no longer re-fetches)
    await loadData(true)
    toast.success('Segment deleted')
    activityStore.log(`Deleted a recording segment from "${name}"`, 'success')
    // Reload details
    const updated = await store.fetchOne(name)
    currentRecording.value = updated
    // If the current page emptied, step back one page.
    const totalPages = Math.ceil((updated.segments?.length || 0) / segPageSize)
    if (segPage.value > totalPages && totalPages > 0) segPage.value = totalPages
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to delete segment'))
  }
}

const pagination = usePagination(
  (page, itemsPerPage) => store.fetchList(page, itemsPerPage),
  20,
  'pagesize:recordings'
)
const lastUpdated = useLastUpdated()

// Whether the full list (all recordings, each with its segment arrays) is
// already in the store. Search filters that list client-side, so typing more
// must not re-download it on every debounced keystroke.
let fullListLoaded = false

const loadData = async (force = false) => {
  await run(async () => {
    if (search.value.trim()) {
      if (!fullListLoaded || force) {
        await store.fetchList(0, 1000)
        fullListLoaded = true
      }
    } else {
      fullListLoaded = false
      await pagination.load()
    }
    initialLoading.value = false
    lastUpdated.markUpdated()
  }, 'Failed to load recordings')
}

const exportCsvData = () => {
  exportCsv(
    `recordings-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Recording Name', 'Segments', 'Total Duration (s)'],
    filteredList.value.map(r => [
      r.name,
      r.segments?.length || 0,
      recordingTotalDurationSeconds(r.segments || []).toFixed(1)
    ])
  )
}

useSearchableList(search, () => loadData())
const autoRefreshCtrl = useAutoRefresh(
  () => loadData(true),
  AUTO_REFRESH_INTERVAL_MS,
  'autorefresh:recordings'
)

// Keep the search box in sync if the query changes while already on this page.
watch(
  () => route.query.q,
  q => {
    search.value = typeof q === 'string' ? q : ''
  }
)

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.drawer-title-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.drawer-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-total {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.drawer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.drawer-hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}

.segments-filtered-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
  margin-left: 6px;
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
