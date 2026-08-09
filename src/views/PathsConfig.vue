<template>
  <div>
    <div class="page-header">
      <h1>
        Path Config <el-tag size="small" round>{{ store.itemCount }}</el-tag>
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
          :active-text="`Auto refresh (${AUTO_REFRESH_INTERVAL_S}s)`"
          @change="autoRefreshCtrl.toggle"
        />
        <span v-if="lastUpdated.label" class="updated-hint">{{ lastUpdated.label }}</span>
        <el-button type="primary" :icon="Plus" @click="showAddDialog">Add Path</el-button>
        <el-button :icon="Refresh" :loading="store.loading" @click="loadData">Refresh</el-button>
      </div>
    </div>
    <p class="page-subtitle">
      Define sources, authentication, and recording rules for each path. Changes apply immediately.
    </p>

    <el-card shadow="hover">
      <el-table v-loading="store.loading" :data="filteredList" style="width: 100%">
        <el-table-column prop="name" label="Path Name" min-width="200" show-overflow-tooltip />
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
        <el-table-column label="Actions" width="90" fixed="right">
          <template #default="{ row }">
            <div class="row-actions">
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
        v-if="!store.loading && filteredList.length === 0"
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
      width="600px"
    >
      <el-tabs v-model="activeTab">
        <el-tab-pane label="Source" name="source">
          <el-form :model="form" label-width="140px">
            <el-form-item label="Path Name" required>
              <el-input v-model="form.name" :disabled="isEdit" placeholder="e.g. mystream" />
            </el-form-item>
            <el-form-item label="Source">
              <el-input
                v-model="form.source"
                placeholder="e.g. rtsp://... (leave empty to publish directly)"
              />
            </el-form-item>
            <el-form-item label="On demand">
              <el-switch v-model="form.sourceOnDemand" />
              <span class="form-hint"
                >Only connect to the source when a reader requests the stream</span
              >
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="Authentication" name="auth">
          <el-form :model="form" label-width="140px">
            <el-form-item label="Publish User">
              <el-input
                v-model="form.publishUser"
                placeholder="Leave empty to allow anyone to publish"
              />
            </el-form-item>
            <el-form-item label="Publish Password">
              <el-input v-model="form.publishPass" type="password" show-password />
            </el-form-item>
            <el-form-item label="Read User">
              <el-input v-model="form.readUser" placeholder="Leave empty to allow anyone to read" />
            </el-form-item>
            <el-form-item label="Read Password">
              <el-input v-model="form.readPass" type="password" show-password />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="Recording" name="record">
          <el-form :model="form" label-width="140px">
            <el-form-item label="Enable Recording">
              <el-switch v-model="form.record" />
            </el-form-item>
            <el-form-item v-if="form.record" label="Recording Path">
              <el-input
                v-model="form.recordPath"
                placeholder="Leave empty to use the global default"
              />
            </el-form-item>
            <el-form-item v-if="form.record" label="Recording Format">
              <el-select v-model="form.recordFormat" style="width: 100%">
                <el-option label="FMP4" value="fmp4" />
                <el-option label="MPEGTS" value="mpegts" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="Hooks" name="hooks">
          <el-form :model="form" label-width="140px">
            <el-form-item label="Run on Ready">
              <el-input
                v-model="form.runOnReady"
                type="textarea"
                :rows="2"
                placeholder="Shell command to run when the stream becomes ready"
              />
              <span class="form-hint"
                >Runs with the MediaMTX server's OS privileges — only use trusted commands</span
              >
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="Advanced" name="advanced">
          <el-form :model="form" label-width="140px">
            <el-form-item label="Run on Demand">
              <el-input
                v-model="form.runOnDemand"
                type="textarea"
                :rows="2"
                placeholder="Shell command to run when a reader requests this path"
              />
              <span class="form-hint"
                >Runs with the MediaMTX server's OS privileges — only use trusted commands</span
              >
            </el-form-item>
            <el-form-item label="Run on Not Ready">
              <el-input
                v-model="form.runOnNotReady"
                type="textarea"
                :rows="2"
                placeholder="Shell command to run when the stream goes down"
              />
            </el-form-item>
            <el-form-item label="Run on Read">
              <el-input
                v-model="form.runOnRead"
                type="textarea"
                :rows="2"
                placeholder="Shell command to run when a reader starts"
              />
            </el-form-item>
            <el-form-item label="Run on Unread">
              <el-input
                v-model="form.runOnUnread"
                type="textarea"
                :rows="2"
                placeholder="Shell command to run when the last reader disconnects"
              />
            </el-form-item>
            <el-form-item label="Publish IPs">
              <el-input
                v-model="publishIPsText"
                placeholder="Comma-separated IPs, e.g. 192.168.1.0/24, 203.0.113.5"
              />
              <span class="form-hint"
                >Restrict which IPs may publish to this path. Leave empty to allow all.</span
              >
            </el-form-item>
            <el-form-item label="Read IPs">
              <el-input
                v-model="readIPsText"
                placeholder="Comma-separated IPs, e.g. 192.168.1.0/24"
              />
              <span class="form-hint"
                >Restrict which IPs may read this path. Leave empty to allow all.</span
              >
            </el-form-item>
            <el-form-item label="Override Publish">
              <el-select v-model="form.overridePublish" style="width: 100%">
                <el-option label="Default (None)" value="none" />
                <el-option label="Allow" value="allow" />
                <el-option label="Deny" value="deny" />
              </el-select>
              <span class="form-hint">Overrides the global publish permission for this path</span>
            </el-form-item>
            <el-form-item label="Record Segment Duration">
              <el-input
                v-model="form.recordSegmentDuration"
                placeholder="e.g. 6s (overrides the global default)"
              />
            </el-form-item>
            <el-form-item label="Record Part Duration">
              <el-input
                v-model="form.recordPartDuration"
                placeholder="e.g. 1s (overrides the global default)"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="dialogVisible = false">Cancel</el-button>
        <el-button type="primary" @click="handleSave">Save</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { usePathsConfigStore } from '@/stores/pathsConfig'
import { useActivityStore } from '@/stores/activity'
import { usePagination } from '@/composables/usePagination'
import { useAutoRefresh, AUTO_REFRESH_INTERVAL_MS } from '@/composables/useAutoRefresh'
import { useSearchableList, filterList } from '@/composables/useSearchableList'
import { useLastUpdated } from '@/composables/useLastUpdated'
import { getErrorMessage } from '@/composables/useErrorMessage'
import { ElMessage } from 'element-plus'
import { Refresh, Search, Plus, Edit, Delete } from '@element-plus/icons-vue'

const AUTO_REFRESH_INTERVAL_S = AUTO_REFRESH_INTERVAL_MS / 1000

const store = usePathsConfigStore()
const activityStore = useActivityStore()
const dialogVisible = ref(false)
const isEdit = ref(false)
const activeTab = ref('source')
const search = ref('')

const filteredList = computed(() =>
  filterList(store.list, search.value, (r: any) => r.name + ' ' + (r.source || ''))
)

const emptyForm = () => ({
  name: '',
  source: '',
  sourceOnDemand: false,
  publishUser: '',
  publishPass: '',
  readUser: '',
  readPass: '',
  record: false,
  recordPath: '',
  recordFormat: 'fmp4',
  runOnReady: '',
  runOnDemand: '',
  runOnNotReady: '',
  runOnRead: '',
  runOnUnread: '',
  publishIPs: [] as string[],
  readIPs: [] as string[],
  overridePublish: 'none',
  recordSegmentDuration: '',
  recordPartDuration: ''
})

const form = reactive(emptyForm())

// publishIPs / readIPs are arrays in the API config; the form edits them as
// comma-separated text.
const splitIPs = (v: string) =>
  v
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

const publishIPsText = computed({
  get: () => (form.publishIPs || []).join(', '),
  set: (v: string) => {
    form.publishIPs = splitIPs(v)
  }
})

const readIPsText = computed({
  get: () => (form.readIPs || []).join(', '),
  set: (v: string) => {
    form.readIPs = splitIPs(v)
  }
})

const showAddDialog = () => {
  isEdit.value = false
  activeTab.value = 'source'
  Object.assign(form, emptyForm())
  dialogVisible.value = true
}

const showEditDialog = (row: any) => {
  isEdit.value = true
  activeTab.value = 'source'
  Object.assign(form, emptyForm(), {
    name: row.name,
    source: row.source || '',
    sourceOnDemand: !!row.sourceOnDemand,
    publishUser: row.publishUser || '',
    publishPass: row.publishPass || '',
    readUser: row.readUser || '',
    readPass: row.readPass || '',
    record: !!row.record,
    recordPath: row.recordPath || '',
    recordFormat: row.recordFormat || 'fmp4',
    runOnReady: row.runOnReady || '',
    runOnDemand: row.runOnDemand || '',
    runOnNotReady: row.runOnNotReady || '',
    runOnRead: row.runOnRead || '',
    runOnUnread: row.runOnUnread || '',
    publishIPs: Array.isArray(row.publishIPs)
      ? row.publishIPs
      : row.publishIPs
        ? String(row.publishIPs).split(',')
        : [],
    readIPs: Array.isArray(row.readIPs)
      ? row.readIPs
      : row.readIPs
        ? String(row.readIPs).split(',')
        : [],
    overridePublish: row.overridePublish || 'none',
    recordSegmentDuration: row.recordSegmentDuration || '',
    recordPartDuration: row.recordPartDuration || ''
  })
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.name) {
    ElMessage.warning('Please enter a path name')
    return
  }
  try {
    const { name, ...rest } = form
    // MediaMTX rejects some empty-string fields outright (e.g. source: ''
    // errors with "invalid source: ''" instead of being treated as "unset"),
    // so omit blanks rather than sending them verbatim.
    const data: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) {
      if (value !== '') data[key] = value
    }
    if (isEdit.value) {
      await store.patch(name, data)
    } else {
      await store.add(name, data)
    }
    // Reload from the page the user is actually on — the store actions no
    // longer re-fetch, so pagination isn't silently reset to page 1.
    await loadData()
    ElMessage.success(`Path config "${name}" saved`)
    activityStore.log(`${isEdit.value ? 'Updated' : 'Added'} path config "${name}"`, 'success')
    dialogVisible.value = false
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Failed to save path config'))
  }
}

const handleDelete = async (name: string) => {
  try {
    await store.remove(name)
    await loadData()
    ElMessage.success(`Path config "${name}" deleted`)
    activityStore.log(`Deleted path config "${name}"`, 'error')
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Failed to delete path config'))
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
.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
