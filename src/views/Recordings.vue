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
        <el-button :icon="Calendar" :loading="activityLoading" @click="toggleActivity"
          >Activity</el-button
        >
        <el-button :icon="Refresh" :loading="store.loading" @click="loadData(true)"
          >Refresh</el-button
        >
      </div>
    </div>
    <p class="page-subtitle">
      Browse and manage recorded segments for each path.
      <el-tag
        v-if="dayFilter"
        type="primary"
        size="small"
        round
        closable
        class="day-filter-tag"
        @close="clearDayFilter"
      >
        {{ formatDayLabel(dayFilter) }} — {{ dayFilteredCount }} recording{{
          dayFilteredCount === 1 ? '' : 's'
        }}
      </el-tag>
    </p>
    <ApiErrorBanner :message="error" :loading="store.loading" @retry="loadData(true)" />

    <el-card v-if="activityVisible" shadow="never" class="activity-card">
      <template #header>
        <div class="activity-header">
          <span class="activity-title">Recording activity</span>
          <span class="activity-hint">Last {{ WEEKS }} weeks — click a day to filter</span>
        </div>
      </template>
      <div v-loading="activityLoading" class="activity-body">
        <template v-if="heatmapTotal > 0">
          <div class="heatmap-wrap">
            <div class="heatmap-months">
              <span
                v-for="(label, i) in monthLabels"
                :key="i"
                class="heatmap-month-label"
                :style="{ marginLeft: label.offset }"
                >{{ label.text }}</span
              >
            </div>
            <div class="heatmap-body">
              <div class="heatmap-days">
                <span class="heatmap-day-label">Mon</span>
                <span class="heatmap-day-label"></span>
                <span class="heatmap-day-label">Wed</span>
                <span class="heatmap-day-label"></span>
                <span class="heatmap-day-label">Fri</span>
                <span class="heatmap-day-label"></span>
                <span class="heatmap-day-label"></span>
              </div>
              <div class="heatmap-weeks">
                <div v-for="(week, wi) in heatmapCells" :key="wi" class="heatmap-week">
                  <el-tooltip
                    v-for="cell in week"
                    :key="cell.key"
                    :content="
                      cell.count > 0
                        ? `${cell.count} segment${cell.count === 1 ? '' : 's'} on ${formatDayLabel(cell.key)}`
                        : formatDayLabel(cell.key)
                    "
                    placement="top"
                    :hide-after="0"
                  >
                    <button
                      type="button"
                      class="heatmap-cell"
                      :class="[`level-${cell.level}`, { 'is-selected': cell.key === dayFilter }]"
                      :aria-label="
                        cell.count > 0
                          ? `${cell.count} segments on ${formatDayLabel(cell.key)}`
                          : formatDayLabel(cell.key)
                      "
                      :aria-pressed="cell.key === dayFilter"
                      @click="toggleDayFilter(cell.key)"
                    />
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
          <div class="heatmap-legend">
            <span>Less</span>
            <span class="legend-cell level-0"></span>
            <span class="legend-cell level-1"></span>
            <span class="legend-cell level-2"></span>
            <span class="legend-cell level-3"></span>
            <span class="legend-cell level-4"></span>
            <span>More</span>
          </div>
        </template>
        <el-empty
          v-else-if="!activityLoading"
          description="No recording activity in the last 26 weeks"
          :image-size="60"
        />
      </div>
    </el-card>

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
        :description="
          dayFilter
            ? `No recordings recorded on ${formatDayLabel(dayFilter)}`
            : search
              ? `No recordings match “${search}”`
              : 'No recordings yet'
        "
      />
      <div v-if="!search && !dayFilter && store.itemCount > 0" class="pagination-bar">
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
        <div class="seg-filter-row">
          <el-date-picker
            v-model="segDateRange"
            type="daterange"
            range-separator="–"
            start-placeholder="From"
            end-placeholder="To"
            size="small"
            style="flex: 1; min-width: 0"
            clearable
            @change="segPage = 1"
          />
          <el-tooltip
            :disabled="!apiReadOnly"
            content="This API user is read-only — deletions are rejected by the server"
            placement="top"
          >
            <el-button
              type="danger"
              plain
              size="small"
              :icon="Delete"
              :loading="deletingRange"
              :disabled="apiReadOnly || !segDateRange || filteredSegments.length === 0"
              aria-label="Delete segments in the selected date range"
              @click="confirmRangeDelete"
            >
              Delete filtered
            </el-button>
          </el-tooltip>
        </div>
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
                      :disabled="apiReadOnly"
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
import { useRoute, useRouter } from 'vue-router'
import { useRecordingsStore } from '@/stores/recordings'
import { useActivityStore } from '@/stores/activity'
import { useConfigStore } from '@/stores/config'
import { useServersStore } from '@/stores/servers'
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
  CopyDocument,
  Calendar
} from '@element-plus/icons-vue'
import { getErrorMessage } from '@/composables/useErrorMessage'
import { apiReadOnly } from '@/api'
import { ElMessageBox } from 'element-plus'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import PathLink from '@/components/PathLink.vue'
import HlsPlayer from '@/components/HlsPlayer.vue'
import type { APIRecording } from '@/types/api'

const SEG_PAGE_SIZE = 20

const store = useRecordingsStore()
const serversStore = useServersStore()
const activityStore = useActivityStore()
const configStore = useConfigStore()
const route = useRoute()
const router = useRouter()
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

const filteredList = computed(() => {
  let list = filterList(store.list, search.value, (r: APIRecording) => r.name)
  if (dayFilter.value) {
    list = list.filter(r =>
      (r.segments || []).some(s => dayKey(new Date(s.start)) === dayFilter.value)
    )
  }
  return list
})

// Recording activity heatmap — segment counts bucketed by local day, rendered
// GitHub-style over the last WEEKS weeks. The full recording list is fetched
// once (lazily, when the panel is first opened) so the heatmap is complete
// regardless of the table's pagination.
const WEEKS = 26
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]
const activityVisible = ref(false)
const activityLoading = ref(false)
let activityLoaded = false
const dayFilter = ref<string | null>(null)

const dayKey = (date: Date) => {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatDayLabel = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Segment counts bucketed by local day. Derived directly from the store so a
// day-filtered reload (or any refresh) keeps the heatmap current — the panel
// doesn't need its own snapshot that can go stale.
const recordingDays = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const rec of store.list) {
    for (const seg of rec.segments || []) {
      const key = dayKey(new Date(seg.start))
      counts[key] = (counts[key] || 0) + 1
    }
  }
  return counts
})

const toggleActivity = async () => {
  activityVisible.value = !activityVisible.value
  if (!activityVisible.value || activityLoaded) return
  activityLoading.value = true
  try {
    await store.fetchAll()
    activityLoaded = true
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to load activity data'))
  } finally {
    activityLoading.value = false
  }
}

const heatmapTotal = computed(() => Object.values(recordingDays.value).reduce((a, b) => a + b, 0))

// Columns of weeks (Mon→Sun), oldest first. Each cell is bucketed by date and
// assigned a 0–4 intensity level by quantizing against the busiest day, so a
// quiet period still shows useful variation.
const heatmapCells = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const daysSinceMonday = (today.getDay() + 6) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - daysSinceMonday - (WEEKS - 1) * 7)
  const weeks: { date: Date; key: string; count: number; level: number }[][] = []
  for (let w = 0; w < WEEKS; w++) {
    const col: { date: Date; key: string; count: number; level: number }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      const key = dayKey(date)
      col.push({ date, key, count: recordingDays.value[key] || 0, level: 0 })
    }
    weeks.push(col)
  }
  const max = Math.max(1, ...weeks.flat().map(c => c.count))
  for (const col of weeks) {
    for (const cell of col) {
      cell.level = cell.count === 0 ? 0 : Math.max(1, Math.ceil((cell.count / max) * 4))
    }
  }
  return weeks
})

const monthLabels = computed(() => {
  const labels: { text: string; offset: string }[] = []
  const weeks = heatmapCells.value
  if (!weeks.length) return labels
  const last = weeks[weeks.length - 1][6].date
  const cursor = new Date(weeks[0][0].date.getFullYear(), weeks[0][0].date.getMonth(), 1)
  while (cursor <= last) {
    const monthStart = new Date(cursor)
    for (let w = 0; w < weeks.length; w++) {
      const weekStart = weeks[w][0].date
      const weekEnd = weeks[w][6].date
      if (monthStart >= weekStart && monthStart <= weekEnd) {
        labels.push({ text: MONTH_LABELS[monthStart.getMonth()], offset: `${w * 13}px` })
        break
      }
    }
    cursor.setMonth(cursor.getMonth() + 1)
    cursor.setDate(1)
  }
  return labels
})

const toggleDayFilter = (key: string) => {
  dayFilter.value = dayFilter.value === key ? null : key
}

const clearDayFilter = () => {
  dayFilter.value = null
}

const dayFilteredCount = computed(() => {
  if (!dayFilter.value) return 0
  return store.list.filter(r =>
    (r.segments || []).some(s => dayKey(new Date(s.start)) === dayFilter.value)
  ).length
})

// Sortable column for the segment count — the count isn't a row field, so it
// needs an explicit comparator (a `prop` alone would sort by row[undefined]).
const compareSegmentCount = (a: APIRecording, b: APIRecording) =>
  (a.segments?.length || 0) - (b.segments?.length || 0)

const compareTotalDuration = (a: APIRecording, b: APIRecording) =>
  recordingTotalDurationSeconds(a.segments || []) - recordingTotalDurationSeconds(b.segments || [])

// While searching, the badge reflects what's on screen rather than the server
// total (the list is fetched in full and filtered client-side).
const displayedCount = computed(() =>
  search.value.trim() || dayFilter.value ? filteredList.value.length : store.itemCount
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

// Bulk delete — removes every segment currently matched by the drawer's date
// range. Sequential calls keep the server's delete path happy on large ranges.
const deletingRange = ref(false)
const confirmRangeDelete = async () => {
  const name = currentRecording.value?.name
  if (!name || !segDateRange.value) return
  const count = filteredSegments.value.length
  if (count === 0) return
  try {
    await ElMessageBox.confirm(
      count > 500
        ? `Delete all ${count} segments in this range? This cannot be undone and will take a while.`
        : `Delete all ${count} segments in this range? This cannot be undone.`,
      'Delete segments',
      { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' }
    )
  } catch {
    return // cancelled
  }
  deletingRange.value = true
  try {
    for (const seg of filteredSegments.value) {
      await store.deleteSegment(name, seg.start)
    }
    toast.success(`Deleted ${count} segments`)
    activityStore.log(`Deleted ${count} recording segments from "${name}"`, 'success')
    await loadData(true)
    currentRecording.value = await store.fetchOne(name)
    const totalPages = Math.ceil((currentRecording.value.segments?.length || 0) / segPageSize)
    if (segPage.value > totalPages && totalPages > 0) segPage.value = totalPages
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to delete segments'))
  } finally {
    deletingRange.value = false
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
    // A day filter (heatmap) also needs the complete list, like search.
    if (search.value.trim() || dayFilter.value) {
      if (!fullListLoaded || force) {
        await store.fetchAll()
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

// Mirror the search box in the URL so a filtered view is shareable and the
// back button undoes it. `replace` keeps history clean while typing.
watch(search, val => {
  const q = route.query.q
  if (val.trim() && q !== val) {
    router.replace({ query: { ...route.query, q: val } })
  } else if (!val.trim() && q !== undefined) {
    const query = { ...route.query }
    delete query.q
    router.replace({ query })
  }
})

onMounted(() => {
  loadData()
})

// A server-profile switch targets a different MediaMTX instance — the cached
// full list, the open recording drawer and any date filter must not carry over.
watch(
  () => serversStore.activeId,
  () => {
    fullListLoaded = false
    drawerVisible.value = false
    currentRecording.value = null
    segDateRange.value = null
    dayFilter.value = null
    loadData()
  }
)
</script>

<style scoped>
.day-filter-tag {
  margin-left: 8px;
}

.activity-card {
  margin-bottom: 16px;
}

.activity-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.activity-title {
  font-size: 14px;
  font-weight: 600;
}

.activity-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.activity-body {
  min-height: 60px;
}

.heatmap-wrap {
  overflow-x: auto;
  padding-bottom: 4px;
}

.heatmap-months {
  display: flex;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  height: 16px;
  margin-left: 28px;
}

.heatmap-month-label {
  flex-shrink: 0;
  width: 13px;
  white-space: nowrap;
}

.heatmap-body {
  display: flex;
  gap: 4px;
}

.heatmap-days {
  display: flex;
  flex-direction: column;
  height: 91px; /* 7 cells × 13px */
  justify-content: space-between;
  font-size: 10px;
  color: var(--el-text-color-secondary);
  padding: 0 2px;
}

.heatmap-day-label {
  line-height: 11px;
}

.heatmap-weeks {
  display: flex;
  gap: 2px;
}

.heatmap-week {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.heatmap-cell {
  width: 11px;
  height: 11px;
  padding: 0;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  background: var(--el-fill-color-light);
  transition: transform 0.1s ease;
}

.heatmap-cell:hover {
  transform: scale(1.2);
}

.heatmap-cell.is-selected {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 1px;
}

.heatmap-cell.level-1 {
  background: var(--el-color-primary-light-9);
}

.heatmap-cell.level-2 {
  background: var(--el-color-primary-light-7);
}

.heatmap-cell.level-3 {
  background: var(--el-color-primary-light-3);
}

.heatmap-cell.level-4 {
  background: var(--el-color-primary);
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 10px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.legend-cell {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 2px;
}

.legend-cell.level-0 {
  background: var(--el-fill-color-light);
}

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

.seg-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
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
