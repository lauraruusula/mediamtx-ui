<template>
  <div>
    <div class="page-header">
      <h1>
        Path Status <el-tag size="small" round>{{ store.itemCount }}</el-tag>
      </h1>
      <div class="page-actions">
        <el-input
          v-model="search"
          placeholder="Search paths"
          clearable
          style="width: 200px"
          :prefix-icon="Search"
        />
        <el-switch
          v-model="autoRefreshCtrl.active.value"
          active-text="Auto refresh (5s)"
          @change="autoRefreshCtrl.toggle"
        />
        <el-button :icon="Refresh" :loading="store.loading" @click="loadData">Refresh</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      Live status of every configured path — who's online, publishing, and being watched right now.
    </p>

    <el-card shadow="hover">
      <el-table v-loading="store.loading" :data="filteredList" style="width: 100%">
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
                  @click="openPlayer(row)"
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
                  @click="showDetail(row)"
                />
              </el-tooltip>
              <CopyLinkButton :path-name="row.name" />
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!store.loading && filteredList.length === 0"
        :description="search ? `No paths match “${search}”` : 'No paths yet'"
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

    <el-drawer v-model="drawerVisible" :title="currentPath?.name" size="450px">
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
        <p class="drawer-hint">
          Default MediaMTX ports — adjust if this server uses custom addresses.
        </p>
        <div class="stream-link-list">
          <div v-for="u in streamUrls" :key="u.protocol" class="stream-link-row">
            <span class="stream-link-label">{{ u.label }}</span>
            <code class="stream-link-url">{{ u.url }}</code>
            <el-button text type="primary" size="small" :icon="DocumentCopy" @click="copyUrl(u)" />
          </div>
        </div>
      </template>

      <template v-if="currentPath?.tracks2?.length">
        <h4 style="margin: 16px 0 8px">Tracks</h4>
        <el-tag v-for="(t, i) in currentPath.tracks2" :key="i" style="margin: 0 4px 4px 0">{{
          t.codec
        }}</el-tag>
      </template>
      <template v-if="currentPath?.readers?.length">
        <h4 style="margin: 16px 0 8px">Readers</h4>
        <el-tag
          v-for="(r, i) in currentPath.readers"
          :key="i"
          type="success"
          style="margin: 0 4px 4px 0"
          >{{ r.type }}</el-tag
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
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePathsStore } from '@/stores/paths'
import { usePagination } from '@/composables/usePagination'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { buildStreamUrls, type StreamUrl } from '@/composables/useStreamUrls'
import { copyToClipboard } from '@/composables/useClipboard'
import { formatBytes, formatSourceType } from '@/composables/useFormatters'
import { ElMessage } from 'element-plus'
import { Refresh, Search, DocumentCopy, VideoPlay, View } from '@element-plus/icons-vue'
import StreamPlayer from '@/components/StreamPlayer.vue'
import CopyLinkButton from '@/components/CopyLinkButton.vue'
import type { APIPath } from '@/types/api'

const store = usePathsStore()
const route = useRoute()
// Prefilled when arriving via a "view this path" link from a connections/sessions
// table (e.g. /paths?q=mystream) so the two views stay cross-navigable.
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const drawerVisible = ref(false)
const currentPath = ref<APIPath | null>(null)
const playerVisible = ref(false)
const playingPath = ref('')

// Search matches across all paths currently loaded on this page. Real-world
// deployments tend to have far fewer configured paths than live connections,
// so pagination is de-emphasized here in favor of always-available search.
const filteredList = computed(() => {
  if (!search.value) return store.list
  const s = search.value.toLowerCase()
  return store.list.filter(p => p.name.toLowerCase().includes(s))
})

const streamUrls = computed(() =>
  currentPath.value ? buildStreamUrls(currentPath.value.name) : []
)

const copyUrl = async (u: StreamUrl) => {
  const ok = await copyToClipboard(u.url)
  ElMessage[ok ? 'success' : 'error'](
    ok ? `Copied ${u.label} URL to clipboard` : 'Could not copy to clipboard'
  )
}

const showDetail = (row: APIPath) => {
  currentPath.value = row
  drawerVisible.value = true
}

const openPlayer = (row: APIPath) => {
  playingPath.value = row.name
  playerVisible.value = true
}

const pagination = usePagination((page, itemsPerPage) => store.fetchList(page, itemsPerPage), 50)
const loadData = () => pagination.load()
const autoRefreshCtrl = useAutoRefresh(loadData)
onMounted(loadData)
</script>

<style scoped>
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
