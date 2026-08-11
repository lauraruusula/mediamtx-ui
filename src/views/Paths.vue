<template>
  <div>
    <div class="page-header">
      <h1>
        Path Status <el-tag size="small" round>{{ displayedCount }}</el-tag>
      </h1>
      <div class="page-actions">
        <el-input
          v-model="search"
          placeholder="Search paths"
          clearable
          style="width: 200px"
          :prefix-icon="Search"
        />
        <el-select v-model="statusFilter" style="width: 130px" aria-label="Filter by status">
          <el-option label="All statuses" value="all" />
          <el-option label="Online" value="online" />
          <el-option label="Available" value="available" />
          <el-option label="Offline" value="offline" />
        </el-select>
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
        <el-button :icon="Refresh" :loading="store.loading" @click="loadData">Refresh</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      Live status of every configured path — who's online, publishing, and being watched right now.
    </p>

    <ApiErrorBanner :message="error" :loading="store.loading" @retry="loadData" />

    <el-card shadow="never">
      <el-table
        v-loading="initialLoading"
        :data="filteredList"
        style="width: 100%"
        :default-sort="sort.defaultSort"
        @sort-change="sort.onSortChange"
      >
        <el-table-column prop="name" label="Path Name" min-width="180" show-overflow-tooltip />
        <el-table-column
          label="Status"
          width="100"
          sortable
          :sort-method="(a: APIPath, b: APIPath) => Number(b.online) - Number(a.online)"
        >
          <template #default="{ row }">
            <el-tag
              :type="row.online ? 'success' : row.available ? 'warning' : 'info'"
              size="small"
            >
              <span v-if="row.online" class="tag-live-dot" />
              {{ row.online ? 'Online' : row.available ? 'Available' : 'Offline' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Source Type" width="130">
          <template #default="{ row }">
            {{ row.source ? formatSourceType(row.source.type) : '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="Tracks"
          width="95"
          align="center"
          sortable
          :sort-method="
            (a: APIPath, b: APIPath) => (a.tracks2?.length || 0) - (b.tracks2?.length || 0)
          "
        >
          <template #default="{ row }">{{ row.tracks2?.length || 0 }}</template>
        </el-table-column>
        <el-table-column
          label="Readers"
          width="105"
          align="center"
          sortable
          :sort-method="
            (a: APIPath, b: APIPath) => (a.readers?.length || 0) - (b.readers?.length || 0)
          "
        >
          <template #default="{ row }">{{ row.readers?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="Inbound" width="120" sortable prop="inboundBytes">
          <template #default="{ row }">{{ formatBytes(row.inboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column label="Outbound" width="120" sortable prop="outboundBytes">
          <template #default="{ row }">{{ formatBytes(row.outboundBytes || 0) }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="120" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-tooltip :content="row.online ? 'Play' : 'Path is offline'" placement="top">
                <el-button
                  :icon="VideoPlay"
                  circle
                  size="small"
                  type="success"
                  plain
                  :disabled="!row.online"
                  aria-label="Play"
                  @click="openPlayer(row as APIPath)"
                />
              </el-tooltip>
              <el-tooltip content="View details" placement="top">
                <el-button
                  :icon="View"
                  circle
                  size="small"
                  type="primary"
                  plain
                  aria-label="View details"
                  @click="showDetail(row as APIPath)"
                />
              </el-tooltip>
              <CopyLinkButton :path-name="row.name" />
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!error && !initialLoading && filteredList.length === 0"
        :description="emptyDescription"
      />
      <div v-if="!search && statusFilter === 'all' && store.itemCount > 0" class="pagination-bar">
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

    <el-drawer v-model="drawerVisible" size="450px">
      <template #header>
        <div class="drawer-header">
          <span class="drawer-title">{{ currentPath?.name }}</span>
          <div class="drawer-actions">
            <el-button
              :icon="Refresh"
              circle
              size="small"
              :loading="refreshingPath"
              aria-label="Refresh path details"
              @click="refreshPath"
            />
            <el-button
              v-if="currentPath?.online"
              type="success"
              size="small"
              plain
              :icon="VideoPlay"
              @click="playFromDrawer"
            >
              Play
            </el-button>
          </div>
        </div>
      </template>
      <el-descriptions v-if="currentPath" :column="1" border>
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
        <el-descriptions-item label="Inbound Traffic">{{
          formatBytes(currentPath.inboundBytes || 0)
        }}</el-descriptions-item>
        <el-descriptions-item label="Outbound Traffic">{{
          formatBytes(currentPath.outboundBytes || 0)
        }}</el-descriptions-item>
      </el-descriptions>

      <template v-if="currentPath">
        <h4 style="margin: 16px 0 8px">Stream Links</h4>
        <p v-if="!portsLoaded" class="drawer-hint">
          Showing default MediaMTX ports — couldn't read this server's live config.
        </p>
        <div class="stream-link-list">
          <div v-for="u in streamUrls" :key="u.protocol" class="stream-link-row">
            <span class="stream-link-label">{{ u.label }}</span>
            <code class="stream-link-url">{{ u.url }}</code>
            <el-tooltip content="Copy URL" placement="top">
              <el-button
                text
                type="primary"
                size="small"
                :icon="DocumentCopy"
                aria-label="Copy URL"
                @click="copyUrl(u)"
              />
            </el-tooltip>
          </div>
        </div>
      </template>

      <template v-if="currentPath?.tracks2?.length">
        <h4 style="margin: 16px 0 8px">Tracks</h4>
        <el-tag v-for="(t, i) in currentPath.tracks2" :key="i" style="margin: 0 4px 4px 0">{{
          trackLabel(t)
        }}</el-tag>
      </template>
      <template v-if="currentPath?.readers?.length">
        <h4 style="margin: 16px 0 8px">Readers</h4>
        <el-tag
          v-for="(r, i) in currentPath.readers"
          :key="i"
          type="success"
          style="margin: 0 4px 4px 0"
          >{{ formatSourceType(r.type) }}</el-tag
        >
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
      <StreamPlayer v-if="playerVisible" :path-name="playingPath" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePathsStore } from '@/stores/paths'
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
import {
  buildStreamUrls,
  streamConfigFromConfig,
  type StreamUrl,
  type StreamUrlConfig
} from '@/composables/useStreamUrls'
import { copyToClipboard } from '@/composables/useClipboard'
import { formatBytes, formatSourceType } from '@/composables/useFormatters'
import { toast } from '@/composables/useToast'
import { getErrorMessage } from '@/composables/useErrorMessage'
import { Refresh, Search, Download, DocumentCopy, VideoPlay, View } from '@element-plus/icons-vue'
import StreamPlayer from '@/components/StreamPlayer.vue'
import CopyLinkButton from '@/components/CopyLinkButton.vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import type { APIPath, APIPathTrack } from '@/types/api'

const store = usePathsStore()
const configStore = useConfigStore()
const route = useRoute()
// Prefilled when arriving via a "view this path" link from a connections/sessions
// table (e.g. /paths?q=mystream) so the two views stay cross-navigable.
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const statusFilter = ref<'all' | 'online' | 'available' | 'offline'>('all')

const drawerVisible = ref(false)
const currentPath = ref<APIPath | null>(null)
const refreshingPath = ref(false)
const playerVisible = ref(false)
const playingPath = ref('')
const streamCfg = ref<StreamUrlConfig>({ ports: {}, enabled: {} })
const portsLoaded = ref(false)
// The loading mask is only meaningful while the table has nothing to render —
// showing it on every auto-refresh tick makes the panel flash. Once the first
// fetch lands, refreshes update rows in place and the refresh button's own
// spinner covers the loading state.
const initialLoading = ref(true)
const { error, run } = useListError()
const sort = useTableSort('sort:paths')

// Use the live global config so stream links reflect real server ports.
configStore
  .ensureLoaded()
  .then(cfg => {
    streamCfg.value = streamConfigFromConfig(cfg)
    portsLoaded.value = true
  })
  .catch(() => {})

// When the admin UI is served over HTTPS, assume HLS/WHEP are behind the same
// TLS edge and advertise https links.
const httpScheme = window.location.protocol === 'https:' ? 'https' : 'http'

const statusMatches = (p: APIPath) =>
  statusFilter.value === 'all'
    ? true
    : statusFilter.value === 'online'
      ? p.online
      : statusFilter.value === 'available'
        ? !p.online && p.available
        : !p.online && !p.available

// Search + status filter. While either is active we fetch the whole list (see
// loadData) so results aren't limited to the current page.
const filteredList = computed(() =>
  filterList(store.list, search.value, (p: APIPath) => p.name).filter(statusMatches)
)

const emptyDescription = computed(() => {
  if (search.value.trim()) return `No paths match “${search.value}”`
  if (statusFilter.value !== 'all') return 'No paths match this status filter'
  return 'No paths yet'
})

// While searching/filtering, the badge reflects what's on screen rather than
// the server total (the list is fetched in full and filtered client-side).
const displayedCount = computed(() =>
  search.value.trim() || statusFilter.value !== 'all' ? filteredList.value.length : store.itemCount
)

const streamUrls = computed(() =>
  currentPath.value
    ? buildStreamUrls(
        currentPath.value.name,
        streamCfg.value.ports,
        streamCfg.value.enabled,
        httpScheme
      )
    : []
)

const copyUrl = async (u: StreamUrl) => {
  const ok = await copyToClipboard(u.url)
  if (ok) {
    toast.success(`Copied ${u.label} URL to clipboard`)
  } else {
    toast.error('Could not copy to clipboard')
  }
}

const trackLabel = (t: APIPathTrack) => {
  const bitrate = (t.codecProps as Record<string, unknown>)?.bitrate
  const bitrateNum = typeof bitrate === 'number' ? bitrate : undefined
  return bitrateNum ? `${t.codec} · ${formatBytes(bitrateNum)}/s` : t.codec
}

const exportCsvData = () => {
  exportCsv(
    `paths-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Path Name', 'Status', 'Source Type', 'Tracks', 'Readers', 'Inbound', 'Outbound'],
    filteredList.value.map(p => [
      p.name,
      p.online ? 'Online' : p.available ? 'Available' : 'Offline',
      p.source ? formatSourceType(p.source.type) : '-',
      p.tracks2?.length || 0,
      p.readers?.length || 0,
      p.inboundBytes || 0,
      p.outboundBytes || 0
    ])
  )
}

const showDetail = (row: APIPath) => {
  currentPath.value = row
  drawerVisible.value = true
}

const refreshPath = async () => {
  if (!currentPath.value) return
  refreshingPath.value = true
  try {
    currentPath.value = await store.fetchOne(currentPath.value.name)
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to refresh path details'))
  } finally {
    refreshingPath.value = false
  }
}

const openPlayer = (row: APIPath) => {
  playingPath.value = row.name
  playerVisible.value = true
}

const playFromDrawer = () => {
  if (!currentPath.value) return
  playingPath.value = currentPath.value.name
  playerVisible.value = true
}

const pagination = usePagination(
  (page, itemsPerPage) => store.fetchList(page, itemsPerPage),
  20,
  'pagesize:paths'
)
const lastUpdated = useLastUpdated()

const loadData = async () => {
  await run(async () => {
    // Searching or filtering covers the whole path list, not just the current
    // page — this is also what makes the /paths?q= cross-links work.
    if (search.value.trim() || statusFilter.value !== 'all') {
      await store.fetchList(0, 1000)
    } else {
      await pagination.load()
    }
    initialLoading.value = false
    lastUpdated.markUpdated()
  }, 'Failed to load paths')
}

useSearchableList(search, () => loadData())
watch(statusFilter, () => loadData())
const autoRefreshCtrl = useAutoRefresh(loadData, AUTO_REFRESH_INTERVAL_MS, 'autorefresh:paths')

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

.drawer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawer-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
}

.stream-link-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stream-link-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--el-fill-color-light);
}

.stream-link-label {
  flex-shrink: 0;
  width: 96px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
}

.stream-link-url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--el-text-color-regular);
}
</style>
