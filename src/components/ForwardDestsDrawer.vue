<template>
  <el-drawer
    :model-value="modelValue"
    size="560px"
    @update:model-value="emit('update:modelValue', $event)"
    @open="onOpen"
    @closed="onClosed"
  >
    <template #header>
      <div class="drawer-header">
        <span class="drawer-title">Forward — {{ pathName }}</span>
        <div class="drawer-actions">
          <el-switch
            v-model="autoRefreshCtrl.active.value"
            :active-text="'Auto refresh'"
            @change="autoRefreshCtrl.toggle"
          />
          <el-button
            :icon="Refresh"
            circle
            size="small"
            :loading="store.loading"
            aria-label="Refresh forwarding status"
            @click="loadLive"
          />
        </div>
      </div>
    </template>

    <ApiErrorBanner :message="error" :loading="loadingConfig" @retry="loadAll" />

    <!-- Configured destinations -->
    <div class="section-head">
      <h4>Destinations</h4>
      <el-button size="small" type="primary" :icon="Plus" @click="startAdd"
        >Add Destination</el-button
      >
    </div>
    <p class="section-desc">
      Streams published to this path are forwarded to each destination below.
    </p>

    <div v-if="dests.length" class="dest-list">
      <div v-for="(d, i) in dests" :key="i" class="dest-row">
        <div class="dest-main">
          <code class="dest-url">{{ redactUrlCredentials(d.dest) }}</code>
          <div class="dest-meta">
            <el-tag size="small">{{ protocolOf(d.dest) }}</el-tag>
            <el-tag v-if="d.destFingerprint" size="small" type="info">
              {{ shortFingerprint(d.destFingerprint) }}
            </el-tag>
            <el-tag v-if="d.whipBearerToken" size="small" type="warning">WHIP auth</el-tag>
          </div>
        </div>
        <div class="dest-actions">
          <el-tooltip content="Edit destination" placement="top">
            <el-button
              :icon="Edit"
              circle
              size="small"
              plain
              aria-label="Edit destination"
              @click="startEdit(i)"
            />
          </el-tooltip>
          <el-popconfirm title="Delete this forward destination?" @confirm="removeDest(i)">
            <template #reference>
              <el-button
                :icon="Delete"
                circle
                size="small"
                type="danger"
                plain
                aria-label="Delete destination"
              />
            </template>
          </el-popconfirm>
        </div>
      </div>
    </div>
    <el-empty
      v-else
      :description="'No forward destinations configured'"
      :image-size="60"
      class="dest-empty"
    />

    <!-- Live status -->
    <div class="section-head live-head">
      <h4>Live Status</h4>
    </div>
    <p class="section-desc">Current forwarding state as reported by the server.</p>

    <el-table v-loading="initialLoading" :data="liveRows" size="small">
      <el-table-column label="Destination" min-width="170" show-overflow-tooltip>
        <template #default="{ row }">
          <code class="live-dest">{{ redactUrlCredentials(row.conf.dest) }}</code>
          <div v-if="row.state === 'error' && row.lastError" class="live-error">
            {{ row.lastError }}
          </div>
        </template>
      </el-table-column>
      <el-table-column label="Protocol" width="85">
        <template #default="{ row }">{{ row.protocol }}</template>
      </el-table-column>
      <el-table-column label="State" width="105">
        <template #default="{ row }">
          <el-tag :type="stateType(row.state)" size="small">{{
            formatForwardState(row.state)
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="Outbound" width="90">
        <template #default="{ row }">{{ formatBytes(row.outboundBytes || 0) }}</template>
      </el-table-column>
      <el-table-column label="Since" width="130">
        <template #default="{ row }">{{ formatDate(row.created) }}</template>
      </el-table-column>
    </el-table>
    <p v-if="liveError" class="live-error-hint">
      Live status unavailable — this path may be offline right now.
    </p>
    <p v-else-if="!initialLoading && liveRows.length === 0" class="drawer-hint">
      No live forwarding reported — this usually means the path is offline right now.
    </p>

    <!-- Add/Edit destination dialog -->
    <el-dialog
      v-model="destDialogVisible"
      :title="editingIndex === null ? 'Add Destination' : 'Edit Destination'"
      width="520px"
      append-to-body
      @closed="resetDestForm"
    >
      <el-form label-width="150px">
        <el-form-item label="Destination URL" required>
          <el-input v-model="destForm.dest" placeholder="rtsp://user:pass@host:8554/$MTX_PATH" />
          <span class="form-hint">
            rtsp(s)://, rtmp(s)://, srt://, or whip(s):// — $MTX_PATH is replaced with this path
            name.
          </span>
        </el-form-item>
        <el-form-item label="Dest Fingerprint">
          <el-input v-model="destForm.destFingerprint" placeholder="TLS fingerprint (optional)" />
          <span class="form-hint">Validates the destination's self-signed certificate.</span>
        </el-form-item>
        <el-form-item label="WHIP Bearer Token">
          <el-input
            v-model="destForm.whipBearerToken"
            type="password"
            show-password
            placeholder="Only used for whip(s) destinations"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="destDialogVisible = false">Cancel</el-button>
        <el-button type="primary" :loading="saving" @click="saveDest">Save</el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useForwardDestsStore } from '@/stores/forwardDests'
import { usePathsConfigStore } from '@/stores/pathsConfig'
import { useActivityStore } from '@/stores/activity'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { useListError } from '@/composables/useListError'
import { getErrorMessage } from '@/composables/useErrorMessage'
import { formatBytes, formatDate } from '@/composables/useFormatters'
import { toast } from '@/composables/useToast'
import { redactUrlCredentials } from '@/composables/useRedaction'
import { Refresh, Plus, Edit, Delete } from '@element-plus/icons-vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import type { APIForwardDest, APIForwardDestConfig } from '@/types/api'

const props = defineProps<{
  modelValue: boolean
  pathName: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const store = useForwardDestsStore()
const pathsConfigStore = usePathsConfigStore()
const activityStore = useActivityStore()
const { error, run } = useListError()

// Configured destinations, loaded from the path's config `forward` array.
const dests = ref<APIForwardDestConfig[]>([])
const saving = ref(false)
// The live table masks only until the first fetch lands — auto-refresh ticks
// update rows in place so the table never flashes.
const initialLoading = ref(true)
const loadingConfig = ref(false)
// Live-state failures (e.g. the path is simply offline) surface as a quiet
// inline hint rather than the error banner, which stays for config errors.
const liveError = ref('')

const loadConfig = async () => {
  loadingConfig.value = true
  try {
    const cfg = await pathsConfigStore.fetchOne(props.pathName)
    dests.value = Array.isArray(cfg.forward)
      ? cfg.forward.map((d: APIForwardDestConfig) => ({ ...d }))
      : []
  } finally {
    loadingConfig.value = false
  }
}

const loadLive = async () => {
  try {
    await store.fetchList(props.pathName)
    liveError.value = ''
  } catch {
    liveError.value = 'unavailable'
  }
}

// Only render rows that belong to the path currently in the drawer — the store
// is shared and keeps the last-requested path's list, which could otherwise
// flash for a different path while a fresh fetch is in flight.
const liveRows = computed<APIForwardDest[]>(() =>
  store.pathName === props.pathName ? store.list : []
)

const loadAll = async () => {
  await run(async () => {
    await loadConfig()
  }, 'Failed to load forward destinations')
  await loadLive()
  initialLoading.value = false
}

const onOpen = () => {
  initialLoading.value = true
  liveError.value = ''
  loadAll()
  // Live status is the interesting part — poll it even if the config fetch
  // fails, and stop once the drawer closes.
  autoRefreshCtrl.start()
}

const onClosed = () => {
  autoRefreshCtrl.stop()
  // The add/edit dialog is teleported to <body>; close it too so it never
  // outlives the drawer it belongs to.
  destDialogVisible.value = false
}

const autoRefreshCtrl = useAutoRefresh(loadLive)

const protocolOf = (dest: string): string => {
  const m = /^([a-z]+):\/\//i.exec(dest)
  return m ? m[1].toLowerCase() : '?'
}

const shortFingerprint = (fp: string): string =>
  fp.length > 17 ? `${fp.slice(0, 8)}…${fp.slice(-8)}` : fp

const stateType = (state: string): 'success' | 'info' | 'danger' =>
  state === 'forwarding' ? 'success' : state === 'error' ? 'danger' : 'info'

const formatForwardState = (state: string): string =>
  state === 'forwarding' ? 'Forwarding' : state === 'error' ? 'Error' : 'Idle'

// Add/Edit dialog
const destDialogVisible = ref(false)
const editingIndex = ref<number | null>(null)
const destForm = reactive<APIForwardDestConfig>(emptyDest())

function emptyDest(): APIForwardDestConfig {
  return { dest: '', destFingerprint: '', whipBearerToken: '' }
}

const resetDestForm = () => {
  Object.assign(destForm, emptyDest())
}

const startAdd = () => {
  editingIndex.value = null
  resetDestForm()
  destDialogVisible.value = true
}

const startEdit = (index: number) => {
  editingIndex.value = index
  Object.assign(destForm, emptyDest(), dests.value[index])
  destDialogVisible.value = true
}

const saveDest = async () => {
  if (!destForm.dest.trim()) {
    toast.warning('Please enter a destination URL')
    return
  }
  const entry: APIForwardDestConfig = {
    dest: destForm.dest.trim(),
    destFingerprint: destForm.destFingerprint,
    whipBearerToken: destForm.whipBearerToken
  }
  if (editingIndex.value === null) {
    dests.value.push(entry)
  } else {
    dests.value[editingIndex.value] = entry
  }
  destDialogVisible.value = false
  await saveAll()
}

const removeDest = async (index: number) => {
  dests.value.splice(index, 1)
  await saveAll()
}

const saveAll = async () => {
  saving.value = true
  try {
    // Destinations are stored in the path config's `forward` array — PATCHing
    // the whole array replaces it, so the local list is the source of truth.
    await pathsConfigStore.patch(props.pathName, { forward: dests.value })
    toast.success(`Forward destinations updated for "${props.pathName}"`)
    activityStore.log(`Updated forward destinations for "${props.pathName}"`, 'success')
    emit('saved')
    await loadAll()
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to save forward destinations'))
    // Restore the server's version of the list so the UI never shows a state
    // the server rejected. Best-effort — don't let a reload failure mask the
    // original error.
    await loadConfig().catch(() => {})
  } finally {
    saving.value = false
  }
}
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
  gap: 12px;
}

.drawer-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
}

.section-head h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.section-desc {
  margin: 4px 0 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.dest-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dest-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--el-fill-color-light);
}

.dest-main {
  min-width: 0;
}

.dest-url {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.dest-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.dest-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.dest-empty {
  padding: 16px 0;
}

.live-head {
  margin-top: 28px;
}

.live-dest {
  font-size: 12px;
}

.live-error {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--el-color-danger);
  overflow-wrap: anywhere;
}

.live-error-hint {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-color-warning);
}

.drawer-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>
