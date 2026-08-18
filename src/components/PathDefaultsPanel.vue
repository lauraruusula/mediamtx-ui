<template>
  <div class="path-defaults-panel">
    <ApiErrorBanner :message="error" :loading="loading" @retry="loadDefaults" />

    <el-card shadow="never" class="defaults-card">
      <div class="panel-head">
        <div>
          <h3>Default Path Settings</h3>
          <p class="panel-desc">
            Values every new path config inherits. Individual paths override these per-field.
          </p>
        </div>
        <div class="panel-actions">
          <el-button :icon="Refresh" :loading="loading" @click="loadDefaults">Refresh</el-button>
          <el-button type="primary" :icon="Check" :loading="saving" @click="saveDefaults">
            Save Defaults
          </el-button>
        </div>
      </div>
      <PathConfForm :form="form" :show-name="false" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { usePathsConfigStore } from '@/stores/pathsConfig'
import { useActivityStore } from '@/stores/activity'
import { useListError } from '@/composables/useListError'
import { getErrorMessage } from '@/composables/useErrorMessage'
import { toast } from '@/composables/useToast'
import { emptyPathConfForm, fillPathConfForm, pathConfPayload } from '@/composables/usePathConfForm'
import type { PathConfForm as PathConfFormModel } from '@/composables/usePathConfForm'
import { Check, Refresh } from '@element-plus/icons-vue'
import ApiErrorBanner from '@/components/ApiErrorBanner.vue'
import PathConfForm from '@/components/PathConfForm.vue'

const store = usePathsConfigStore()
const activityStore = useActivityStore()
const loading = ref(false)
const saving = ref(false)
const { error, run } = useListError()
const form = reactive<PathConfFormModel>(emptyPathConfForm())

const loadDefaults = async () => {
  await run(async () => {
    loading.value = true
    try {
      const defaults = await store.fetchDefaults()
      fillPathConfForm(form, defaults || {})
    } finally {
      loading.value = false
    }
  }, 'Failed to load path defaults')
}

const saveDefaults = async () => {
  saving.value = true
  try {
    // Defaults must not carry a name — MediaMTX would reject (or worse, apply)
    // a path name where a default belongs.
    const payload = pathConfPayload(form)
    delete payload.name
    await store.patchDefaults(payload)
    toast.success('Path defaults saved')
    activityStore.log('Updated default path settings', 'success')
    await loadDefaults()
  } catch (err) {
    toast.error(getErrorMessage(err, 'Failed to save path defaults'))
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadDefaults()
})

// When the panel is hidden (lazy tab) and re-shown, keep the form in sync with
// the server's latest state.
watch(
  () => store.defaults,
  defaults => {
    if (defaults) fillPathConfForm(form, defaults)
  }
)
</script>

<style scoped>
.defaults-card {
  border-radius: 8px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-head h3 {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
}

.panel-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .panel-head {
    flex-direction: column;
  }
}
</style>
