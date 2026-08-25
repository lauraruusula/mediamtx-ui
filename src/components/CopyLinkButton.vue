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
        <el-dropdown-item v-if="urls.length > 1" divided :command="'__all__'">
          <el-icon><Files /></el-icon>
          Copy all URLs
        </el-dropdown-item>
      </template>
    </el-dropdown>
  </el-tooltip>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Link, DocumentCopy, Files } from '@element-plus/icons-vue'
import { toast } from '@/composables/useToast'
import { useConfigStore } from '@/stores/config'
import {
  buildStreamUrls,
  streamConfigFromConfig,
  type StreamUrl,
  type StreamUrlConfig
} from '@/composables/useStreamUrls'
import { copyToClipboard } from '@/composables/useClipboard'

const props = defineProps<{
  pathName: string
}>()

const configStore = useConfigStore()
const streamCfg = ref<StreamUrlConfig>({ ports: {}, enabled: {}, encryption: {} })
const portsLoaded = ref(false)

// Use the live global config so the URLs reflect the server's real ports and
// disabled protocols are hidden. Falls back to defaults (with a caveat) if the
// config can't be fetched.
onMounted(() => {
  configStore
    .ensureLoaded()
    .then(cfg => {
      streamCfg.value = streamConfigFromConfig(cfg)
      portsLoaded.value = true
    })
    .catch(() => {})
})

// When the admin UI itself is served over HTTPS, assume HLS/WHEP are behind the
// same TLS edge and advertise https links.
const httpScheme = window.location.protocol === 'https:' ? 'https' : 'http'

const urls = computed(() =>
  buildStreamUrls(
    props.pathName,
    streamCfg.value.ports,
    streamCfg.value.enabled,
    httpScheme,
    streamCfg.value.encryption
  )
)

async function handleCopy(u: StreamUrl | '__all__') {
  if (u === '__all__') {
    const all = urls.value.map(item => `${item.label}: ${item.url}`).join('\n')
    const ok = await copyToClipboard(all)
    if (ok) {
      toast.success(`Copied ${urls.value.length} stream URLs to clipboard`)
    } else {
      toast.error('Could not copy to clipboard')
    }
    return
  }
  const ok = await copyToClipboard(u.url)
  if (ok) {
    toast.success(`Copied ${u.label} URL to clipboard`)
  } else {
    toast.error('Could not copy to clipboard')
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
