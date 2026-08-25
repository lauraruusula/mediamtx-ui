<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useServersStore, type ServerProfile } from '@/stores/servers'
import { toast } from '@/composables/useToast'
import { Plus, Delete, Edit, Check } from '@element-plus/icons-vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const store = useServersStore()

interface FormState {
  name: string
  apiBaseUrl: string
  streamHost: string
}
const emptyForm: FormState = { name: '', apiBaseUrl: '', streamHost: '' }
const form = reactive<FormState>({ ...emptyForm })
const editingId = ref<string | null>(null)
const formError = ref('')

const visibleModel = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v)
})

const close = () => {
  emit('update:visible', false)
  editingId.value = null
  formError.value = ''
  Object.assign(form, emptyForm)
}

const startAdd = () => {
  editingId.value = null
  formError.value = ''
  Object.assign(form, emptyForm)
}

const startEdit = (profile: ServerProfile) => {
  editingId.value = profile.id
  formError.value = ''
  form.name = profile.name
  form.apiBaseUrl = profile.apiBaseUrl
  form.streamHost = profile.streamHost
}

const submit = () => {
  if (!form.name.trim()) {
    formError.value = 'A name is required'
    return
  }
  const apiBaseUrl = form.apiBaseUrl.trim()
  if (apiBaseUrl && !/^(https?:\/\/|\/)/i.test(apiBaseUrl)) {
    formError.value = 'API URL must start with http://, https:// or /'
    return
  }
  if (editingId.value) {
    store.updateProfile(editingId.value, { ...form, name: form.name.trim() })
    toast.success('Profile updated')
  } else {
    store.addProfile(form.name, apiBaseUrl, form.streamHost)
    toast.success('Profile added')
  }
  Object.assign(form, emptyForm)
  editingId.value = null
  formError.value = ''
}

const remove = (profile: ServerProfile) => {
  if (store.profiles.length <= 1) {
    toast.error('At least one profile is required')
    return
  }
  store.deleteProfile(profile.id)
  toast.success(`Removed "${profile.name}"`)
}

const activate = (id: string) => {
  store.setActive(id)
  toast.success(`Switched to "${store.activeProfile.name}"`)
}
</script>

<template>
  <el-dialog
    :model-value="visibleModel"
    title="Server profiles"
    width="560px"
    @update:model-value="visibleModel = $event"
    @closed="close"
  >
    <p class="profiles-hint">
      Manage the MediaMTX servers this console talks to. Switching a profile re-points the API and
      adjusts stream / playback URLs. Leave fields empty to inherit the current UI host and API
      proxy.
    </p>

    <div class="profile-list">
      <div
        v-for="profile in store.profiles"
        :key="profile.id"
        class="profile-row"
        :class="{ active: profile.id === store.activeId }"
      >
        <div class="profile-info">
          <div class="profile-name">
            {{ profile.name }}
            <el-tag v-if="profile.id === store.activeId" size="small" type="primary" effect="light">
              Active
            </el-tag>
          </div>
          <div class="profile-meta">
            {{ profile.apiBaseUrl || '/api (this UI)' }}
            <template v-if="profile.streamHost"> · stream host {{ profile.streamHost }}</template>
          </div>
        </div>
        <div class="profile-actions">
          <el-tooltip
            v-if="profile.id !== store.activeId"
            content="Switch to this server"
            placement="top"
          >
            <el-button
              :icon="Check"
              circle
              size="small"
              type="success"
              plain
              aria-label="Switch to this server"
              @click="activate(profile.id)"
            />
          </el-tooltip>
          <el-tooltip content="Edit" placement="top">
            <el-button
              :icon="Edit"
              circle
              size="small"
              plain
              aria-label="Edit profile"
              @click="startEdit(profile)"
            />
          </el-tooltip>
          <el-tooltip content="Remove" placement="top">
            <el-button
              :icon="Delete"
              circle
              size="small"
              type="danger"
              plain
              aria-label="Remove profile"
              @click="remove(profile)"
            />
          </el-tooltip>
        </div>
      </div>
    </div>

    <el-divider content-position="left">
      <span class="profiles-divider-text">{{ editingId ? 'Edit profile' : 'Add profile' }}</span>
    </el-divider>

    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="Name" required>
        <el-input v-model="form.name" placeholder="e.g. Production RTSP" maxlength="60" />
      </el-form-item>
      <el-form-item label="API base URL">
        <el-input v-model="form.apiBaseUrl" placeholder="/api (same UI)" maxlength="200" />
        <p class="profiles-field-hint">
          Absolute URL (e.g. <code>https://mtx.example.com:9997</code>) for a remote server, or a
          <code>/path</code> prefix for a different proxy route. The target must allow CORS.
        </p>
      </el-form-item>
      <el-form-item label="Stream host">
        <el-input v-model="form.streamHost" placeholder="e.g. stream.example.com" maxlength="120" />
        <p class="profiles-field-hint">
          Host used in stream and playback links when it differs from this UI's host. Do not include
          a port — links use each protocol's own port.
        </p>
      </el-form-item>
      <p v-if="formError" class="profiles-form-error">{{ formError }}</p>
      <div class="profiles-form-actions">
        <el-button @click="startAdd">Reset</el-button>
        <el-button type="primary" :icon="Plus" @click="submit">
          {{ editingId ? 'Save changes' : 'Add profile' }}
        </el-button>
      </div>
    </el-form>
  </el-dialog>
</template>

<style scoped>
.profiles-hint {
  margin: 0 0 14px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.profile-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: border-color 0.15s ease;
}

.profile-row.active {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.profile-info {
  min-width: 0;
}

.profile-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.profile-meta {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.profiles-divider-text {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.profiles-field-hint {
  width: 100%;
  margin: 4px 0 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.profiles-field-hint code {
  background: var(--el-fill-color-light);
  padding: 1px 4px;
  border-radius: 4px;
}

.profiles-form-error {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--el-color-danger);
}

.profiles-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
