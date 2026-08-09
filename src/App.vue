<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useThemeStore } from './stores/theme'
import { useSystemStore } from './stores/system'
import { useActivityStore } from './stores/activity'
import { useRoute } from 'vue-router'
import { formatUptime, formatRelativeTime, formatVersion } from './composables/useFormatters'
import { getPaths } from './api/system'
import CommandPalette from './components/CommandPalette.vue'
import {
  VideoCamera,
  Odometer,
  VideoPlay,
  Connection,
  Setting,
  Link,
  Monitor,
  User,
  Film,
  Files,
  Promotion,
  Folder,
  Bell,
  Expand,
  Fold,
  Sunny,
  Moon,
  Search
} from '@element-plus/icons-vue'

const isCollapse = ref(false)
const isMobile = ref(false)
const route = useRoute()
const themeStore = useThemeStore()
const systemStore = useSystemStore()
const activityStore = useActivityStore()
const appVersion = __APP_VERSION__
const paletteVisible = ref(false)

const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

const checkIsMobile = () => {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value && !isCollapse.value) {
    isCollapse.value = true
  }
}

const openPalette = () => {
  paletteVisible.value = true
}

const onGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    paletteVisible.value = true
  }
}

// Lightweight server-alert poller: MediaMTX has no push events, so we poll the
// paths endpoint and surface online/offline transitions in the activity bell.
let previousOnline: Record<string, boolean> = {}
let alertTimer: ReturnType<typeof setInterval> | null = null

const checkPathAlerts = async () => {
  if (document.hidden) return
  try {
    const res = (await getPaths(0, 1000)) as { items?: { name: string; online: boolean }[] }
    const current: Record<string, boolean> = {}
    for (const p of res.items || []) current[p.name] = p.online
    const names = new Set([...Object.keys(previousOnline), ...Object.keys(current)])
    for (const name of names) {
      const was = previousOnline[name]
      const now = current[name]
      if (was !== undefined && now !== undefined && was !== now) {
        activityStore.log(
          now ? `Path "${name}" came online` : `Path "${name}" went offline`,
          now ? 'success' : 'error'
        )
      }
    }
    previousOnline = current
  } catch {
    // Server unreachable — skip this round
  }
}

onMounted(() => {
  checkIsMobile()
  window.addEventListener('resize', checkIsMobile)
  window.addEventListener('keydown', onGlobalKeydown)
  systemStore.fetchInfo().catch(() => {})
  alertTimer = setInterval(checkPathAlerts, 15000)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkIsMobile)
  window.removeEventListener('keydown', onGlobalKeydown)
  if (alertTimer) clearInterval(alertTimer)
})

watch(
  () => route.path,
  () => {
    if (isMobile.value) isCollapse.value = true
  }
)
</script>

<template>
  <div class="app-wrapper">
    <!-- Mobile mask -->
    <div v-if="isMobile && !isCollapse" class="sidebar-mask" @click="isCollapse = true" />

    <!-- Sidebar -->
    <aside
      :style="{ width: isCollapse ? '68px' : '240px' }"
      :class="[
        'sidebar-container',
        { collapsed: isMobile && isCollapse, 'mobile-open': isMobile && !isCollapse }
      ]"
    >
      <div class="sidebar-logo">
        <div class="logo-badge">
          <el-icon><VideoCamera /></el-icon>
        </div>
        <div v-if="!isCollapse" class="logo-text-group">
          <span class="logo-text">MediaMTX</span>
          <span class="logo-subtext">Admin Console</span>
        </div>
      </div>

      <el-menu
        :router="true"
        :default-active="$route.path"
        class="sidebar-menu"
        :collapse="isCollapse"
        :collapse-transition="false"
      >
        <el-menu-item index="/">
          <el-icon><Odometer /></el-icon>
          <template #title>Dashboard</template>
        </el-menu-item>

        <el-sub-menu index="streams">
          <template #title>
            <el-icon><VideoPlay /></el-icon>
            <span>Stream Management</span>
          </template>
          <el-menu-item index="/paths">
            <el-icon><Connection /></el-icon>
            <span>Path Status</span>
          </el-menu-item>
          <el-menu-item index="/paths/config">
            <el-icon><Setting /></el-icon>
            <span>Path Config</span>
          </el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="connections">
          <template #title>
            <el-icon><Link /></el-icon>
            <span>Connection Management</span>
          </template>
          <el-menu-item index="/rtsp/connections">
            <el-icon><Monitor /></el-icon>
            <span>RTSP Connections</span>
          </el-menu-item>
          <el-menu-item index="/rtsp/sessions">
            <el-icon><User /></el-icon>
            <span>RTSP Sessions</span>
          </el-menu-item>
          <el-menu-item index="/rtmp/connections">
            <el-icon><Film /></el-icon>
            <span>RTMP Connections</span>
          </el-menu-item>
          <el-menu-item index="/webrtc/sessions">
            <el-icon><VideoCamera /></el-icon>
            <span>WebRTC Sessions</span>
          </el-menu-item>
          <el-menu-item index="/hls/muxers">
            <el-icon><Files /></el-icon>
            <span>HLS Muxers</span>
          </el-menu-item>
          <el-menu-item index="/srt/connections">
            <el-icon><Promotion /></el-icon>
            <span>SRT Connections</span>
          </el-menu-item>
        </el-sub-menu>

        <el-menu-item index="/recordings">
          <el-icon><Folder /></el-icon>
          <template #title>Recordings</template>
        </el-menu-item>

        <el-menu-item index="/config">
          <el-icon><Setting /></el-icon>
          <template #title>System Config</template>
        </el-menu-item>
      </el-menu>

      <div v-if="!isCollapse" class="sidebar-footer">
        <span class="sidebar-footer-text">Admin Console v{{ appVersion }}</span>
        <span
          :class="['sidebar-footer-text', 'server-version', { offline: !systemStore.connected }]"
        >
          MediaMTX
          {{
            systemStore.connected && systemStore.info
              ? formatVersion(systemStore.info.version)
              : 'offline'
          }}
        </span>
        <a
          class="sidebar-footer-link"
          href="https://github.com/lauraruusula/mediamtx-ui"
          target="_blank"
          rel="noopener noreferrer"
        >
          Report a bug or request a feature
        </a>
      </div>
    </aside>

    <!-- Main -->
    <div class="main-container">
      <header class="app-header">
        <div class="header-left">
          <button class="icon-btn" aria-label="Toggle sidebar" @click="toggleSidebar">
            <el-icon>
              <Expand v-if="isCollapse" />
              <Fold v-else />
            </el-icon>
          </button>
          <span class="header-title">{{ $route.meta.title || 'MediaMTX' }}</span>
        </div>
        <div class="header-right">
          <el-tooltip content="Quick search (⌘K)" placement="bottom">
            <button class="icon-btn" aria-label="Quick search" @click="openPalette">
              <el-icon><Search /></el-icon>
            </button>
          </el-tooltip>

          <el-tooltip
            v-if="systemStore.info"
            :content="
              systemStore.connected
                ? `MediaMTX ${formatVersion(systemStore.info.version)} · running for ${formatUptime(
                    systemStore.info.started
                  )}`
                : 'MediaMTX server is unreachable'
            "
            placement="bottom"
          >
            <div class="server-pill">
              <span :class="['status-dot', { offline: !systemStore.connected }]" />
              <span v-if="systemStore.connected">{{ formatUptime(systemStore.info.started) }}</span>
              <span v-else>Offline</span>
            </div>
          </el-tooltip>

          <el-popover
            placement="bottom-end"
            :width="320"
            trigger="click"
            @show="activityStore.markRead()"
          >
            <template #reference>
              <button class="icon-btn activity-btn" aria-label="Recent activity">
                <el-icon><Bell /></el-icon>
                <span v-if="activityStore.unread > 0" class="activity-badge">{{
                  activityStore.unread > 9 ? '9+' : activityStore.unread
                }}</span>
              </button>
            </template>
            <div class="activity-panel">
              <div class="activity-panel-header">
                <span>Recent Activity</span>
                <el-button
                  v-if="activityStore.entries.length"
                  text
                  size="small"
                  @click="activityStore.clear()"
                  >Clear</el-button
                >
              </div>
              <p v-if="activityStore.entries.length === 0" class="activity-empty">
                Actions you take — kicks, saves, deletes — will show up here for this session.
              </p>
              <div v-else class="activity-list">
                <div v-for="e in activityStore.entries" :key="e.id" class="activity-item">
                  <span :class="['activity-dot', e.level]" />
                  <div class="activity-item-body">
                    <div class="activity-message">{{ e.message }}</div>
                    <div class="activity-time">{{ formatRelativeTime(e.at) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </el-popover>

          <el-tooltip
            :content="themeStore.currentTheme === 'dark' ? 'Light mode' : 'Dark mode'"
            placement="bottom"
          >
            <button class="icon-btn" aria-label="Toggle theme" @click="themeStore.toggleTheme()">
              <el-icon>
                <Sunny v-if="themeStore.currentTheme === 'dark'" />
                <Moon v-else />
              </el-icon>
            </button>
          </el-tooltip>
        </div>
      </header>

      <main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <CommandPalette v-model:visible="paletteVisible" />
  </div>
</template>

<style scoped>
.sidebar-container {
  flex-shrink: 0;
}

.sidebar-menu {
  border-right: none;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 240px;
}

.sidebar-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 16px;
  border-top: 1px solid var(--sidebar-border);
}

.sidebar-footer-text {
  font-size: 11px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.server-version.offline {
  color: var(--el-text-color-placeholder);
  font-weight: 400;
}

.sidebar-footer-link {
  font-size: 10.5px;
  color: var(--el-text-color-placeholder);
  text-decoration: none;
  transition: color 0.15s ease;
}

.sidebar-footer-link:hover {
  color: var(--el-color-primary);
  text-decoration: underline;
}

@media (max-width: 768px) {
  .sidebar-container.mobile-open {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 101;
  }
}
</style>
