<template>
  <div>
    <div class="page-header">
      <h1>
        Path Config <el-tag size="small" round>{{ displayedCount }}</el-tag>
      </h1>
      <div class="page-actions">
        <el-input
          v-model="search"
          placeholder="Search path configs"
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
        <el-button type="primary" :icon="Plus" @click="showAddDialog">Add Path Config</el-button>
        <el-button :icon="Refresh" :loading="store.loading" @click="loadData">Refresh</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      Define sources, authentication, and recording rules for each path. Changes apply immediately.
    </p>

    <ApiErrorBanner :message="error" :loading="store.loading" @retry="loadData" />

    <el-card shadow="never">
      <el-table v-loading="initialLoading" :data="filteredList" style="width: 100%">
        <el-table-column prop="name" label="Path Name" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <router-link class="cell-link" :to="{ path: '/paths', query: { q: row.name } }">
              {{ row.name }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column label="Live" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="liveState.has(row.name)"
              :type="liveState.get(row.name) ? 'success' : 'info'"
              size="small"
            >
              {{ liveState.get(row.name) ? 'Online' : 'Offline' }}
            </el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="Source" min-width="220">
          <template #default="{ row }">
            <span>{{ row.source || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="On Demand" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.sourceOnDemand" type="warning" size="small">On Demand</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="Auth" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.publishUser || row.readUser" type="info" size="small"
              >Protected</el-tag
            >
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="Recording" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.record" type="success" size="small">On</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="Forward" width="90" align="center">
          <template #default="{ row }">
            <el-tag
              v-if="forwardCount(row) > 0"
              class="forward-tag"
              type="primary"
              size="small"
              role="button"
              tabindex="0"
              @click="openForward(row.name)"
              @keydown.enter.prevent="openForward(row.name)"
              >{{ forwardCount(row) }}</el-tag
            >
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="Actions" width="170" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
              <el-tooltip content="Forward destinations" placement="top">
                <el-button
                  :icon="Promotion"
                  circle
                  size="small"
                  plain
                  aria-label="Forward destinations"
                  @click="openForward(row.name)"
                />
              </el-tooltip>
              <el-tooltip content="Edit" placement="top">
                <el-button
                  :icon="Edit"
                  circle
                  size="small"
                  type="primary"
                  plain
                  aria-label="Edit"
                  @click="showEditDialog(row)"
                />
              </el-tooltip>
              <el-tooltip content="Duplicate as a new path" placement="top">
                <el-button
                  :icon="CopyDocument"
                  circle
                  size="small"
                  plain
                  aria-label="Duplicate as a new path"
                  @click="showCloneDialog(row)"
                />
              </el-tooltip>
              <el-popconfirm
                title="Delete this path config? This cannot be undone."
                @confirm="handleDelete(row.name)"
              >
                <template #reference>
                  <el-button
                    :icon="Delete"
                    circle
                    size="small"
                    type="danger"
                    plain
                    title="Delete"
                    aria-label="Delete"
                  />
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-empty
        v-if="!error && !initialLoading && filteredList.length === 0"
        :description="
          search
            ? `No path configs match “${search}”`
            : 'No path configs yet — add one to get started'
        "
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

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? 'Edit Path Config' : 'Add Path Config'"
      width="640px"
      @closed="onDialogClosed"
    >
      <PathConfForm :form="form" :name-disabled="isEdit" />
      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">Save</el-button>
      </template>
    </el-dialog>

    <ForwardDestsDrawer
      v-model="forwardDrawerVisible"
      :path-name="forwardPath"
      @saved="loadData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { usePathsConfigStore } from '@/stores/pathsConfig'
import { usePathsStore } from '@/stores/paths'
import { useActivityStore } from '@/stores/activity'
import { usePagination } from '@/composables/usePagination'
import {
  useAutoRefresh,
  AUTO_REFRESH_INTERVAL_MS,
  AUTO_REFRESH_INTERVAL_OPTIONS_MS
} from '@/composables/useAutoRefresh'
import { useSearchableList, filterList } from '@/composables/useSearchableList'
import { useLastUpdated } from '@/composables/useLastUpdated'
import { useListError } from '@/composables/useListError'
import { exportCsv } from '@/composables/useCsvExport'
import { getErrorMessage } from '@/composables/useErrorMessage'
import { toast } from '@/composables/useToast'
import { emptyPathConfForm, fillPathConfForm, pathConfPayload } from '@/composables/usePathConfForm'
import type { PathConfForm as PathConfFormModel } from '@/composables/usePathConfForm'
import {
  Refresh,
  Search,
  Plus,
  Edit,
  Delete,
  Download,
  CopyDocument,
  Promotion
} from '@element-plus/icons-vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import PathConfForm from '@/components/PathConfForm.vue'
import ForwardDestsDrawer from '@/components/ForwardDestsDrawer.vue'

const store = usePathsConfigStore()
const pathsStore = usePathsStore()
const activityStore = useActivityStore()
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const search = ref('')
const forwardDrawerVisible = ref(false)
const forwardPath = ref('')
// The loading mask is only meaningful while the table has nothing to render —
// showing it on every auto-refresh tick makes the panel flash. Once the first
// fetch lands, refreshes update rows in place and the refresh button's own
// spinner covers the loading state.
const initialLoading = ref(true)

const filteredList = computed(() =>
  filterList(store.list, search.value, (r: any) => r.name + ' ' + (r.source || ''))
)

// While searching, the badge reflects what's on screen rather than the server
// total (the list is fetched in full and filtered client-side).
const displayedCount = computed(() =>
  search.value.trim() ? filteredList.value.length : store.itemCount
)

// Live online/offline state, cross-linked from the Path Status store so admins
// can see at a glance whether a configured path is currently being served.
const liveState = computed(() => new Map(pathsStore.list.map(p => [p.name, !!p.online])))

const forwardCount = (row: any): number =>
  Array.isArray(row.forward) ? row.forward.length : 0

const openForward = (name: string) => {
  forwardPath.value = name
  forwardDrawerVisible.value = true
}

const form = reactive<PathConfFormModel>(emptyPathConfForm())

const showAddDialog = () => {
  isEdit.value = false
  Object.assign(form, emptyPathConfForm())
  dialogVisible.value = true
}

const showEditDialog = (row: any) => {
  isEdit.value = true
  fillPathConfForm(form, row)
  dialogVisible.value = true
}

const showCloneDialog = (row: any) => {
  // Prefill everything from the source path but blank the name, so saving
  // creates a new path config instead of overwriting the original.
  isEdit.value = false
  fillPathConfForm(form, row)
  form.name = ''
  dialogVisible.value = true
}

const onDialogClosed = () => {
  Object.assign(form, emptyPathConfForm())
}

const handleSave = async () => {
  if (!form.name) {
    toast.warning('Please enter a path name')
    return
  }
  saving.value = true
  try {
    const data = pathConfPayload(form)
    if (isEdit.value) {
      await store.patch(form.name, data)
    } else {
      await store.add(form.name, data)
    }
    // Reload from the page the user is actually on — the store actions no
    // longer re-fetch, so pagination isn't silently reset to page 1.
    await loadData()
    toast.success(`Path config "${form.name}" saved`)
    activityStore.log(`${isEdit.value ? 'Updated' : 'Added'} path config "${form.name}"`, 'success')
    dialogVisible.value = false
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to save path config'))
  } finally {
    saving.value = false
  }
}

const handleDelete = async (name: string) => {
  try {
    await store.remove(name)
    await loadData()
    toast.success(`Path config "${name}" deleted`)
    activityStore.log(`Deleted path config "${name}"`, 'error')
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to delete path config'))
  }
}

const pagination = usePagination(
  (page, itemsPerPage) => store.fetchList(page, itemsPerPage),
  20,
  'pagesize:path-configs'
)
const lastUpdated = useLastUpdated()
const { error, run } = useListError()

const loadData = async () => {
  await run(async () => {
    if (search.value.trim()) {
      await store.fetchList(0, 1000)
    } else {
      await pagination.load()
    }
    initialLoading.value = false
    lastUpdated.markUpdated()
  }, 'Failed to load path configs')
}

const exportCsvData = () => {
  exportCsv(
    `path-configs-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Path Name', 'Live', 'Source', 'On Demand', 'Protected', 'Recording', 'Forward'],
    filteredList.value.map((r: any) => [
      r.name,
      liveState.value.has(r.name) ? (liveState.value.get(r.name) ? 'Online' : 'Offline') : '—',
      r.source || '',
      r.sourceOnDemand ? 'Yes' : 'No',
      r.publishUser || r.readUser ? 'Yes' : 'No',
      r.record ? 'Yes' : 'No',
      forwardCount(r)
    ])
  )
}

useSearchableList(search, () => loadData())
const autoRefreshCtrl = useAutoRefresh(
  loadData,
  AUTO_REFRESH_INTERVAL_MS,
  'autorefresh:path-configs'
)
onMounted(() => {
  loadData()
  // Fetch the live path list too (guarded — /v3/paths/list can 404 before the
  // API is fully up), so the Online/Offline column has something to render.
  pathsStore.fetchList(0, 1000).catch(() => {})
})
</script>

<style scoped>
.forward-tag {
  cursor: pointer;
}

.forward-tag:hover {
  opacity: 0.85;
}
</style>
