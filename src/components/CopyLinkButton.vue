<template>
  <el-tooltip content="Copy stream link" placement="top">
    <el-dropdown trigger="click" @command="handleCopy">
      <el-button :icon="Link" circle size="small" plain aria-label="Copy stream link" />
      <template #dropdown>
        <div v-if="!portsLoaded" class="copy-link-caveat">
          Showing default MediaMTX ports — couldn't read this server's live config.
        </div>
        <el-dropdown-item v-for="u in urls" :key="u.protocol" :command="u">
          <el-icon><DocumentCopy /></el-icon>
          {{ u.label }}
        </el-dropdown-item>
      </template>
    </el-dropdown>
  </el-tooltip>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Link, DocumentCopy } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import {
  buildStreamUrls,
  portsFromConfig,
  type StreamUrl,
  type StreamUrlPorts
} from '@/composables/useStreamUrls'
import { copyToClipboard } from '@/composables/useClipboard'

const props = defineProps<{
  pathName: string
}>()

const configStore = useConfigStore()
const ports = ref<StreamUrlPorts>({})
const portsLoaded = ref(false)

// Use the live global config so the URLs reflect the server's real ports.
// Falls back to defaults (with a caveat) if the config can't be fetched.
onMounted(() => {
  configStore
    .ensureLoaded()
    .then(cfg => {
      ports.value = portsFromConfig(cfg)
      portsLoaded.value = true
    })
    .catch(() => {})
})

const urls = computed(() => buildStreamUrls(props.pathName, ports.value))

async function handleCopy(u: StreamUrl) {
  const ok = await copyToClipboard(u.url)
  if (ok) {
    ElMessage.success(`Copied ${u.label} URL to clipboard`)
  } else {
    ElMessage.error('Could not copy to clipboard')
  }
}
</script>

<style scoped>
.copy-link-caveat {
  max-width: 220px;
  padding: 6px 20px 8px;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 4px;
}
</style>
