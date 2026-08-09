<template>
  <el-dropdown trigger="click" @command="handleCopy">
    <el-tooltip content="Copy stream link" placement="top">
      <el-button :icon="Link" circle size="small" plain aria-label="Copy stream link" @click.stop />
    </el-tooltip>
    <template #dropdown>
      <div class="copy-link-caveat">
        Default MediaMTX ports — adjust if this server uses custom addresses.
      </div>
      <el-dropdown-item v-for="u in urls" :key="u.protocol" :command="u">
        <el-icon><DocumentCopy /></el-icon>
        {{ u.label }}
      </el-dropdown-item>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Link, DocumentCopy } from '@element-plus/icons-vue'
import { buildStreamUrls, type StreamUrl } from '@/composables/useStreamUrls'
import { copyToClipboard } from '@/composables/useClipboard'

const props = defineProps<{
  pathName: string
}>()

const urls = computed(() => buildStreamUrls(props.pathName))

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
