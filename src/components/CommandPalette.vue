<template>
  <el-dialog
    v-model="visible"
    class="command-palette"
    :show-close="false"
    width="560px"
    top="12vh"
    align-center
    :close-on-click-modal="true"
  >
    <div class="palette-search">
      <el-icon class="palette-search-icon"><Search /></el-icon>
      <input
        ref="inputEl"
        v-model="query"
        class="palette-input"
        placeholder="Search paths, recordings, or jump to a page…"
        @keydown.up.prevent="move(-1)"
        @keydown.down.prevent="move(1)"
        @keydown.enter.prevent="runActive"
      />
      <kbd class="palette-kbd">ESC</kbd>
    </div>

    <div v-if="!groups.length" class="palette-empty">No matches</div>
    <div v-else class="palette-groups">
      <div v-for="group in groups" :key="group.name" class="palette-group">
        <div class="palette-group-title">{{ group.name }}</div>
        <div
          v-for="item in group.items"
          :key="item.key"
          class="palette-item"
          :data-palette-key="item.key"
          :class="{ active: item.key === items[activeIndex]?.key }"
          @click="run(item)"
          @mouseenter="activeIndex = items.findIndex(i => i.key === item.key)"
        >
          <el-icon class="palette-item-icon"><component :is="item.icon" /></el-icon>
          <span class="palette-item-label">{{ item.label }}</span>
          <span v-if="item.hint" class="palette-item-hint">{{ item.hint }}</span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  Odometer,
  Connection,
  Setting,
  Monitor,
  User,
  Film,
  VideoCamera,
  Files,
  Promotion,
  Folder,
  Refresh,
  Moon,
  BellFilled
} from '@element-plus/icons-vue'
import { usePathsStore } from '@/stores/paths'
import { useThemeStore } from '@/stores/theme'
import { useActivityStore } from '@/stores/activity'
import { listRecordings } from '@/api/recordings'
import { useConfigStore, type ProtocolKey } from '@/stores/config'
import { toast } from '@/composables/useToast'
import {
  notificationsEnabled,
  setNotificationsEnabled,
  requestNotificationPermission
} from '@/composables/usePathNotifications'
import type { APIRecording, APIListResponse } from '@/types/api'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const router = useRouter()
const pathsStore = usePathsStore()
const configStore = useConfigStore()
const themeStore = useThemeStore()
const activityStore = useActivityStore()

const visible = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v)
})

const query = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const activeIndex = ref(0)
// Paths are small and make the palette useful immediately, so they load on
// first open. Recordings can carry thousands of segments each, so they're
// only fetched once the user actually starts typing — and capped to a recent
// window so a busy server's full recording history never stalls the palette.
let pathsLoaded = false
let recordingsLoaded = false
const recordingsLoading = ref(false)
const recordings = ref<APIRecording[]>([])
const MAX_PALETTE_RECORDINGS = 200
// With an empty query the palette would render every path at once — cap it to
// keep the first open snappy. Typed queries show all matches.
const MAX_EMPTY_QUERY_ITEMS = 100

interface PaletteItem {
  key: string
  group: string
  label: string
  hint?: string
  icon: Component
  protocolKey?: ProtocolKey
  run: () => void
}

const NAV_ITEMS: PaletteItem[] = [
  {
    key: 'nav:/',
    group: 'Pages',
    label: 'Dashboard',
    icon: Odometer,
    run: () => router.push('/')
  },
  {
    key: 'nav:/paths',
    group: 'Pages',
    label: 'Path Status',
    icon: Connection,
    run: () => router.push('/paths')
  },
  {
    key: 'nav:/paths/config',
    group: 'Pages',
    label: 'Path Config',
    icon: Setting,
    run: () => router.push('/paths/config')
  },
  {
    key: 'nav:/rtsp/connections',
    group: 'Pages',
    label: 'RTSP Connections',
    icon: Monitor,
    protocolKey: 'rtsp',
    run: () => router.push('/rtsp/connections')
  },
  {
    key: 'nav:/rtsp/sessions',
    group: 'Pages',
    label: 'RTSP Sessions',
    icon: User,
    protocolKey: 'rtsp',
    run: () => router.push('/rtsp/sessions')
  },
  {
    key: 'nav:/rtmp/connections',
    group: 'Pages',
    label: 'RTMP Connections',
    icon: Film,
    protocolKey: 'rtmp',
    run: () => router.push('/rtmp/connections')
  },
  {
    key: 'nav:/webrtc/sessions',
    group: 'Pages',
    label: 'WebRTC Sessions',
    icon: VideoCamera,
    protocolKey: 'webrtc',
    run: () => router.push('/webrtc/sessions')
  },
  {
    key: 'nav:/hls/muxers',
    group: 'Pages',
    label: 'HLS Muxers',
    icon: Files,
    protocolKey: 'hls',
    run: () => router.push('/hls/muxers')
  },
  {
    key: 'nav:/srt/connections',
    group: 'Pages',
    label: 'SRT Connections',
    icon: Promotion,
    protocolKey: 'srt',
    run: () => router.push('/srt/connections')
  },
  {
    key: 'nav:/recordings',
    group: 'Pages',
    label: 'Recordings',
    icon: Folder,
    run: () => router.push('/recordings')
  },
  {
    key: 'nav:/config',
    group: 'Pages',
    label: 'System Config',
    icon: Setting,
    run: () => router.push('/config')
  }
]

// Quick actions that don't navigate anywhere but are handy from the palette.
const ACTION_ITEMS: PaletteItem[] = [
  {
    key: 'action:theme',
    group: 'Actions',
    label: 'Toggle dark mode',
    icon: Moon,
    run: () => themeStore.toggleTheme()
  },
  {
    key: 'action:activity',
    group: 'Actions',
    label: 'Clear activity log',
    icon: BellFilled,
    run: () => {
      activityStore.clear()
      toast.success('Activity log cleared')
    }
  },
  {
    key: 'action:notifications',
    group: 'Actions',
    label: 'Toggle path notifications',
    icon: Refresh,
    run: async () => {
      if (!notificationsEnabled()) {
        const granted = await requestNotificationPermission()
        if (!granted) {
          toast.error('Notifications are blocked by the browser')
          return
        }
        setNotificationsEnabled(true)
        toast.success('Path notifications enabled')
      } else {
        setNotificationsEnabled(false)
        toast.info('Path notifications disabled')
      }
    }
  }
]

// Pages for disabled protocols would 404 server-side, so they're hidden from
// the palette until the global config confirms the protocol is on.
const navItems = computed<PaletteItem[]>(() =>
  NAV_ITEMS.filter(item => !item.protocolKey || configStore.protocolEnabled(item.protocolKey))
)

const pathItems = computed<PaletteItem[]>(() =>
  pathsStore.list.map(p => ({
    key: `path:${p.name}`,
    group: 'Paths',
    label: p.name,
    hint: p.online ? 'Online' : 'Offline',
    icon: Connection,
    run: () => router.push({ path: '/paths', query: { q: p.name } })
  }))
)

const recordingItems = computed<PaletteItem[]>(() =>
  recordings.value.map(r => ({
    key: `rec:${r.name}`,
    group: 'Recordings',
    label: r.name,
    hint: `${r.segments?.length || 0} segments`,
    icon: Folder,
    run: () => router.push({ path: '/recordings', query: { q: r.name } })
  }))
)

const items = computed(() => {
  const q = query.value.trim().toLowerCase()
  const match = (label: string) => !q || label.toLowerCase().includes(q)
  const filtered = [
    ...navItems.value,
    ...pathItems.value,
    ...recordingItems.value,
    ...ACTION_ITEMS
  ].filter(i => match(i.label))
  return q ? filtered : filtered.slice(0, MAX_EMPTY_QUERY_ITEMS)
})

const groups = computed(() => {
  const order = ['Pages', 'Paths', 'Recordings', 'Actions']
  const byGroup = new Map<string, PaletteItem[]>()
  for (const item of items.value) {
    if (!byGroup.has(item.group)) byGroup.set(item.group, [])
    byGroup.get(item.group)!.push(item)
  }
  return [...byGroup.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([name, groupItems]) => ({ name, items: groupItems }))
})

const ensureRecordings = async () => {
  if (recordingsLoaded || recordingsLoading.value) return
  recordingsLoading.value = true
  try {
    const res = (await listRecordings(
      0,
      MAX_PALETTE_RECORDINGS
    )) as unknown as APIListResponse<APIRecording>
    recordings.value = res.items || []
  } catch {
    // Best-effort — the palette still works with pages and paths.
  } finally {
    recordingsLoaded = true
    recordingsLoading.value = false
  }
}

watch(visible, async v => {
  if (!v) return
  query.value = ''
  activeIndex.value = 0
  await nextTick()
  inputEl.value?.focus()
  configStore.ensureLoaded().catch(() => {})
  if (!pathsLoaded) {
    pathsLoaded = true
    pathsStore.fetchList(0, 1000).catch(() => {})
  }
})

watch(query, q => {
  activeIndex.value = 0
  if (q.trim()) ensureRecordings()
})

const move = (delta: number) => {
  if (!items.value.length) return
  activeIndex.value = (activeIndex.value + delta + items.value.length) % items.value.length
  const active = items.value[activeIndex.value]
  const el = document.querySelector(`[data-palette-key="${CSS.escape(active.key)}"]`)
  el?.scrollIntoView({ block: 'nearest' })
}

const runActive = () => {
  const item = items.value[activeIndex.value]
  if (item) run(item)
}

const run = (item: PaletteItem) => {
  visible.value = false
  item.run()
}
</script>

<style scoped>
.palette-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.palette-search-icon {
  color: var(--el-text-color-secondary);
  font-size: 16px;
}

.palette-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.palette-input::placeholder {
  color: var(--el-text-color-placeholder);
}

.palette-kbd {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
}

.palette-groups {
  max-height: 380px;
  overflow-y: auto;
  padding: 6px;
}

.palette-group-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--el-text-color-secondary);
  padding: 8px 10px 4px;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
}

.palette-item.active {
  background: var(--el-fill-color-light);
}

.palette-item-icon {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.palette-item.active .palette-item-icon {
  color: var(--el-color-primary);
}

.palette-item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.palette-item-hint {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  flex-shrink: 0;
}

.palette-empty {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
