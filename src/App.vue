<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  type Component as VueComponent
} from 'vue'
import { useThemeStore } from './stores/theme'
import { useSystemStore } from './stores/system'
import { useActivityStore } from './stores/activity'
import { useConfigStore } from './stores/config'
import { useRoute, useRouter } from 'vue-router'
import { formatUptime, formatRelativeTime, formatVersion } from './composables/useFormatters'
import { getAllPaths } from './api/system'
import {
  notificationsEnabled,
  setNotificationsEnabled,
  requestNotificationPermission,
  notificationPermission,
  notifyPathTransitions,
  notifyPathHealth,
  checkSustainedOutages,
  offlineThreshold,
  setOfflineThreshold,
  reseedPathBaseline,
  reseedPathHealth
} from './composables/usePathNotifications'
import { toast } from './composables/useToast'
import { getApiAuth, onApiAuthRequired, apiReadOnly } from './api'
import { useServersStore } from './stores/servers'
import CommandPalette from './components/CommandPalette.vue'
import LoginDialog from './components/LoginDialog.vue'
import ServerProfilesDialog from './components/ServerProfilesDialog.vue'
import UptimeText from './components/UptimeText.vue'
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
  BellFilled,
  Lock,
  Sunny,
  Moon,
  Search,
  Expand,
  ArrowDown,
  Close
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const themeStore = useThemeStore()
const systemStore = useSystemStore()
const activityStore = useActivityStore()
const configStore = useConfigStore()
// Created here (root of the app) so the persisted server profile's API base
// URL and stream host are applied before any view fetches data.
const serversStore = useServersStore()
const serversDialogVisible = ref(false)
const appVersion = __APP_VERSION__
const paletteVisible = ref(false)
const notifyEnabled = ref(notificationsEnabled())
const notifyOfflineThreshold = ref(offlineThreshold())
const loginVisible = ref(false)
// Track whether the API demanded credentials, and whether we hold any now.
const apiAuthRequired = ref(false)
const hasApiAuth = ref(getApiAuth() !== null)

const onOfflineThresholdChange = (seconds: number) => {
  setOfflineThreshold(seconds)
  notifyOfflineThreshold.value = seconds
  toast.info(seconds > 0 ? `Notified after ${seconds}s offline` : 'Offline follow-up disabled')
}

const toggleNotifications = async () => {
  const enabling = !notifyEnabled.value
  if (enabling) {
    const granted = await requestNotificationPermission()
    if (!granted) {
      toast.error('Notifications are blocked by the browser. Allow them in site settings.')
      return
    }
    setNotificationsEnabled(true)
    notifyEnabled.value = true
    toast.success('Path notifications enabled')
  } else {
    setNotificationsEnabled(false)
    notifyEnabled.value = false
    toast.info('Path notifications disabled')
  }
}

// Chrome 94+ dropped notifications from cross-origin iframes; show a hint in
// the popover when the permission can't be granted because of context.
const notificationsUnsupported = computed(() => notificationPermission() === 'unsupported')

// Below this width the horizontal nav is replaced by a hamburger + slide-over.
const COMPACT_BREAKPOINT = 1024
const isCompact = ref(false)

// Mobile / compact drawer
const isMobileNavOpen = ref(false)
const drawerOpenGroups = ref<Record<string, boolean>>({})

interface NavChild {
  label: string
  route: string
  icon?: VueComponent
}

interface NavGroup {
  label: string
  icon?: VueComponent
  children: NavChild[]
}

const directNav: NavChild[] = [
  { label: 'Dashboard', route: '/', icon: Odometer },
  { label: 'Recordings', route: '/recordings', icon: Folder },
  { label: 'System Config', route: '/config', icon: Setting }
]

// Streams and Connections are grouped; protocol pages are filtered by the
// server's live config so disabled protocols never surface.
const navGroups = computed<NavGroup[]>(() =>
  [
    {
      label: 'Streams',
      icon: VideoPlay,
      children: [
        { label: 'Path Status', route: '/paths', icon: Connection },
        { label: 'Path Config', route: '/paths/config', icon: Setting }
      ]
    },
    {
      label: 'Connections',
      icon: Link,
      children: [
        ...(configStore.protocolEnabled('rtsp')
          ? [
              { label: 'RTSP Connections', route: '/rtsp/connections', icon: Monitor },
              { label: 'RTSP Sessions', route: '/rtsp/sessions', icon: User }
            ]
          : []),
        ...(configStore.protocolEnabled('rtmp')
          ? [{ label: 'RTMP Connections', route: '/rtmp/connections', icon: Film }]
          : []),
        ...(configStore.protocolEnabled('webrtc')
          ? [{ label: 'WebRTC Sessions', route: '/webrtc/sessions', icon: VideoCamera }]
          : []),
        ...(configStore.protocolEnabled('hls')
          ? [{ label: 'HLS Muxers', route: '/hls/muxers', icon: Files }]
          : []),
        ...(configStore.protocolEnabled('srt')
          ? [{ label: 'SRT Connections', route: '/srt/connections', icon: Promotion }]
          : [])
      ]
    }
  ].filter((group: NavGroup) => group.children.length > 0)
)

const isChildActive = (child: NavChild) =>
  route.path === child.route || route.path.startsWith(child.route + '/')

const isGroupActive = (group: NavGroup) => group.children.some(isChildActive)

const navigate = (routePath: string) => {
  if (route.path !== routePath) router.push(routePath)
  isMobileNavOpen.value = false
}

const toggleMobileNav = () => {
  isMobileNavOpen.value = !isMobileNavOpen.value
}

const toggleGroup = (label: string) => {
  drawerOpenGroups.value[label] = !drawerOpenGroups.value[label]
}

const openPalette = () => {
  paletteVisible.value = true
}

const onServerCommand = (command: string) => {
  if (command === 'manage') {
    serversDialogVisible.value = true
    return
  }
  serversStore.setActive(command)
  toast.success(`Switched to "${serversStore.activeProfile.name}"`)
  // The new server may have a different version, uptime and protocol config —
  // refresh the header state and nav visibility. `reload` bypasses the config
  // cache so protocol flags and stream-URL ports match the new server.
  systemStore.fetchInfo().catch(() => {})
  configStore.reload().catch(() => {})
}

const checkIsCompact = () => {
  isCompact.value = window.innerWidth < COMPACT_BREAKPOINT
  if (isCompact.value) isMobileNavOpen.value = false
}

// S10: keyboard shortcuts. `?` shows the shortcuts dialog; `g` then a key
// jumps to a page (like editor go-to menus). Shortcuts are ignored while
// typing in a field so they never fire mid-edit.
const shortcutsVisible = ref(false)
let goPending = false
let goPendingAt = 0

const isTypingTarget = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  )
}

const onGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    paletteVisible.value = true
    return
  }
  if (isTypingTarget(e)) return
  // `?` — usually shift+/ — opens the shortcuts reference.
  if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault()
    shortcutsVisible.value = true
    return
  }
  // `g` prefix: a single g on its own does nothing until the second key.
  if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    goPending = true
    goPendingAt = Date.now()
    return
  }
  if (goPending) {
    const withinWindow = Date.now() - goPendingAt <= 1500
    goPending = false
    if (!withinWindow) return
    const target: Record<string, string> = {
      p: '/paths',
      r: '/recordings',
      c: '/config',
      h: '/'
    }
    const routeTo = target[e.key.toLowerCase()]
    if (routeTo) {
      e.preventDefault()
      if (route.path !== routeTo) router.push(routeTo)
    }
  }
}

// Lightweight server-alert poller: MediaMTX has no push events, so we poll the
// paths endpoint and surface online/offline transitions in the activity bell.
// The dashboard and Paths page already fetch path state themselves, so those
// routes skip the duplicate request entirely. Polling continues while the tab
// is hidden so background notifications still work.
let previousOnline: Record<string, boolean> = {}
let alertTimer: ReturnType<typeof setInterval> | null = null
// Set while we're skipping the poller on a path-centric route; the next real
// fetch re-seeds the baseline silently so the bell doesn't replay transitions
// that happened while the user was already watching path status.
let alertPaused = false

type PathSnapshot = { name: string; online: boolean; inboundFramesInError?: number | null }

const diffPathStates = (items: PathSnapshot[]) => {
  const current: Record<string, boolean> = {}
  for (const p of items) current[p.name] = p.online
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
  // Feed the full snapshot to the notification baseline so it detects the same
  // transitions independently of the bell diff above. The health tracker and
  // the sustained-outage check run on the same snapshot.
  notifyPathTransitions(items)
  notifyPathHealth(items)
  checkSustainedOutages(items)
}

const reseedBaseline = (items: PathSnapshot[]) => {
  previousOnline = {}
  for (const p of items) previousOnline[p.name] = p.online
  reseedPathBaseline(items)
  reseedPathHealth(items)
}

const checkPathAlerts = async () => {
  // Background polling exists to feed desktop notifications — when they're
  // disabled, a hidden tab has no reason to keep downloading the full path
  // list every 15s. The foreground poller still runs (the activity bell needs
  // the transitions), and `document.hidden` throttles nothing by itself.
  if (document.hidden && !notificationsEnabled()) return
  if (route.path === '/') {
    // The dashboard polls the full path list on its own cadence — diff that.
    if (alertPaused) {
      alertPaused = false
      reseedBaseline(systemStore.paths)
    } else {
      diffPathStates(systemStore.paths)
    }
    return
  }
  if (route.path === '/paths') {
    // The Paths page shows live path status itself, so skip the duplicate
    // full-list fetch. Keep the header status honest with a tiny /info probe
    // (also refreshes version/uptime) and re-seed the baseline silently when
    // leaving, so the bell doesn't replay transitions from this period.
    alertPaused = true
    systemStore.fetchInfo().catch(() => {
      systemStore.connected = false
    })
    return
  }
  try {
    // Fetch every page — the diff baseline and the notification tracker must
    // see all paths, not just the first 1,000.
    const res = await getAllPaths()
    // A reachable API means the server is up — restore the header status even
    // on pages that never call /info themselves.
    systemStore.connected = true
    if (alertPaused) {
      alertPaused = false
      reseedBaseline(res)
    } else {
      diffPathStates(res)
    }
  } catch {
    systemStore.connected = false
  }
}

// When the drawer opens, expand every group so the whole nav is visible.
watch(isMobileNavOpen, open => {
  if (!open) return
  const state: Record<string, boolean> = {}
  for (const group of navGroups.value) state[group.label] = true
  drawerOpenGroups.value = state
})

watch(
  () => route.path,
  () => {
    if (isCompact.value) isMobileNavOpen.value = false
  }
)

onMounted(() => {
  checkIsCompact()
  window.addEventListener('resize', checkIsCompact)
  window.addEventListener('keydown', onGlobalKeydown)
  systemStore.fetchInfo().catch(() => {})
  // Needed for protocol-aware nav; safe to ignore failures (falls back to shown).
  configStore.ensureLoaded().catch(() => {})
  alertTimer = setInterval(checkPathAlerts, 15000)
  // Any 401 from the API means authentication is required — surface the
  // sign-in dialog once. (Only the first 401 triggers it.)
  onApiAuthRequired(() => {
    apiAuthRequired.value = true
    loginVisible.value = true
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkIsCompact)
  window.removeEventListener('keydown', onGlobalKeydown)
  if (alertTimer) clearInterval(alertTimer)
})
</script>

<template>
  <div class="app-wrapper">
    <!-- Drawer mask -->
    <transition name="fade">
      <div v-if="isMobileNavOpen" class="drawer-mask" @click="isMobileNavOpen = false" />
    </transition>

    <!-- Mobile / compact nav drawer -->
    <transition name="drawer">
      <aside v-if="isMobileNavOpen" class="mobile-drawer">
        <div class="mobile-drawer-header">
          <router-link
            to="/"
            class="logo"
            aria-label="Go to dashboard"
            @click="isMobileNavOpen = false"
          >
            <span class="logo-badge"
              ><el-icon><VideoCamera /></el-icon
            ></span>
            <span class="logo-text-group">
              <span class="logo-text">MediaMTX</span>
              <span class="logo-subtext">Admin Console</span>
            </span>
          </router-link>
          <button class="icon-btn" aria-label="Close menu" @click="isMobileNavOpen = false">
            <el-icon><Close /></el-icon>
          </button>
        </div>

        <nav class="mobile-nav">
          <button
            v-for="item in directNav"
            :key="item.route"
            class="mobile-nav-item"
            :class="{ active: isChildActive(item) }"
            @click="navigate(item.route)"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </button>

          <div v-for="group in navGroups" :key="group.label" class="mobile-nav-group">
            <button class="mobile-nav-group-title" @click="toggleGroup(group.label)">
              <el-icon><component :is="group.icon" /></el-icon>
              <span>{{ group.label }}</span>
              <el-icon class="mobile-nav-chevron" :class="{ open: drawerOpenGroups[group.label] }"
                ><ArrowDown
              /></el-icon>
            </button>
            <div v-if="drawerOpenGroups[group.label]" class="mobile-nav-group-body">
              <button
                v-for="child in group.children"
                :key="child.route"
                class="mobile-nav-item"
                :class="{ active: isChildActive(child) }"
                @click="navigate(child.route)"
              >
                <el-icon><component :is="child.icon" /></el-icon>
                <span>{{ child.label }}</span>
              </button>
            </div>
          </div>
        </nav>

        <div class="mobile-drawer-footer">
          <div class="mobile-drawer-status">
            <span :class="['status-dot', { offline: !systemStore.connected }]" />
            <span>
              {{ systemStore.connected ? 'Connected' : 'Offline' }}
              <template v-if="systemStore.connected && systemStore.info">
                · MediaMTX {{ formatVersion(systemStore.info.version) }}
              </template>
            </span>
          </div>
          <span class="mobile-drawer-version">Admin Console v{{ appVersion }}</span>
          <a
            class="mobile-drawer-link"
            href="https://github.com/lauraruusula/mediamtx-ui"
            target="_blank"
            rel="noopener noreferrer"
          >
            Report a bug or request a feature
          </a>
        </div>
      </aside>
    </transition>

    <!-- Main column -->
    <div class="main-container">
      <header class="app-header">
        <div class="header-left">
          <button
            v-if="isCompact"
            class="icon-btn"
            aria-label="Toggle navigation"
            @click="toggleMobileNav"
          >
            <el-icon><Expand /></el-icon>
          </button>

          <router-link to="/" class="logo" aria-label="Go to dashboard">
            <span class="logo-badge"
              ><el-icon><VideoCamera /></el-icon
            ></span>
            <span class="logo-text-group">
              <span class="logo-text">MediaMTX</span>
              <span class="logo-subtext">Admin Console</span>
            </span>
          </router-link>

          <nav v-if="!isCompact" class="topnav">
            <router-link
              v-for="item in directNav"
              :key="item.route"
              :to="item.route"
              class="topnav-item"
              :class="{ active: isChildActive(item) }"
            >
              {{ item.label }}
            </router-link>

            <el-dropdown
              v-for="group in navGroups"
              :key="group.label"
              trigger="hover"
              placement="bottom-start"
              :show-timeout="80"
              @command="navigate"
            >
              <button
                class="topnav-item"
                :class="{ active: isGroupActive(group) }"
                aria-haspopup="menu"
              >
                {{ group.label }}
                <el-icon class="topnav-chevron"><ArrowDown /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="child in group.children"
                    :key="child.route"
                    :command="child.route"
                    :class="{ active: isChildActive(child) }"
                  >
                    <span class="topnav-dropdown-label">{{ child.label }}</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </nav>
        </div>

        <div class="header-right">
          <el-tooltip content="Quick search (⌘K)" placement="bottom">
            <button class="icon-btn" aria-label="Quick search" @click="openPalette">
              <el-icon><Search /></el-icon>
            </button>
          </el-tooltip>

          <el-dropdown
            trigger="click"
            placement="bottom-end"
            :show-timeout="80"
            @command="onServerCommand"
          >
            <button
              class="server-switcher"
              :aria-label="`Active server: ${serversStore.activeProfile.name}`"
            >
              <el-icon><Monitor /></el-icon>
              <span class="server-switcher-name">{{ serversStore.activeProfile.name }}</span>
              <el-icon class="server-switcher-chevron"><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="profile in serversStore.profiles"
                  :key="profile.id"
                  :command="profile.id"
                >
                  <span class="server-dropdown-item">
                    <span class="server-dropdown-label">{{ profile.name }}</span>
                    <el-tag v-if="profile.id === serversStore.activeId" size="small" effect="plain">
                      Active
                    </el-tag>
                  </span>
                </el-dropdown-item>
                <el-dropdown-item divided command="manage">
                  <span class="server-dropdown-item">
                    <el-icon><Setting /></el-icon>
                    <span class="server-dropdown-label">Manage servers…</span>
                  </span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

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
              <UptimeText v-if="systemStore.connected" :started="systemStore.info?.started" />
              <span v-else>Offline</span>
            </div>
          </el-tooltip>

          <el-tooltip
            v-if="hasApiAuth || apiAuthRequired"
            :content="hasApiAuth ? 'API authentication — manage sign-in' : 'API requires sign-in'"
            placement="bottom"
          >
            <button
              class="icon-btn"
              :class="{ enabled: hasApiAuth }"
              aria-label="API authentication"
              @click="loginVisible = true"
            >
              <el-icon><Lock /></el-icon>
            </button>
          </el-tooltip>

          <el-popover placement="bottom-end" :width="300" trigger="click">
            <template #reference>
              <button
                class="icon-btn"
                :class="{ enabled: notifyEnabled }"
                :aria-label="notifyEnabled ? 'Disable notifications' : 'Enable notifications'"
              >
                <el-icon><BellFilled v-if="notifyEnabled" /><Bell v-else /></el-icon>
              </button>
            </template>
            <div class="notify-panel">
              <div class="notify-panel-title">Path notifications</div>
              <div class="notify-panel-row">
                <span>Notify on path online/offline</span>
                <el-switch v-model="notifyEnabled" size="small" @change="toggleNotifications" />
              </div>
              <div v-if="notifyEnabled" class="notify-panel-row">
                <span>Follow up when offline for</span>
                <el-select
                  :model-value="notifyOfflineThreshold"
                  size="small"
                  style="width: 110px"
                  aria-label="Offline follow-up threshold"
                  @change="onOfflineThresholdChange"
                >
                  <el-option label="Never" :value="0" />
                  <el-option label="30 seconds" :value="30" />
                  <el-option label="1 minute" :value="60" />
                  <el-option label="5 minutes" :value="300" />
                  <el-option label="10 minutes" :value="600" />
                </el-select>
              </div>
              <p v-if="notificationsUnsupported" class="notify-panel-hint">
                Notifications are unavailable in this browser context.
              </p>
            </div>
          </el-popover>

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
              <div v-else class="activity-list" aria-live="polite">
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
        <div v-if="apiReadOnly" class="readonly-banner" role="status">
          <el-icon><Lock /></el-icon>
          <span
            >This API user is read-only — saving config, kicking sessions, and deleting recordings
            will be rejected by the server.</span
          >
        </div>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <CommandPalette v-model:visible="paletteVisible" />
    <LoginDialog v-model:visible="loginVisible" />
    <ServerProfilesDialog v-model:visible="serversDialogVisible" />

    <el-dialog
      v-model="shortcutsVisible"
      title="Keyboard shortcuts"
      width="420px"
      align-center
      :close-on-click-modal="true"
    >
      <div class="shortcut-list">
        <div class="shortcut-row">
          <span class="shortcut-keys"><kbd>⌘</kbd><kbd>K</kbd></span>
          <span>Open quick search</span>
        </div>
        <div class="shortcut-row">
          <span class="shortcut-keys"><kbd>g</kbd><kbd>p</kbd></span>
          <span>Go to Path Status</span>
        </div>
        <div class="shortcut-row">
          <span class="shortcut-keys"><kbd>g</kbd><kbd>r</kbd></span>
          <span>Go to Recordings</span>
        </div>
        <div class="shortcut-row">
          <span class="shortcut-keys"><kbd>g</kbd><kbd>c</kbd></span>
          <span>Go to System Config</span>
        </div>
        <div class="shortcut-row">
          <span class="shortcut-keys"><kbd>g</kbd><kbd>h</kbd></span>
          <span>Go to Dashboard</span>
        </div>
        <div class="shortcut-row">
          <span class="shortcut-keys"><kbd>?</kbd></span>
          <span>Show this list</span>
        </div>
      </div>
      <p class="shortcut-hint">Shortcuts are ignored while typing in a field.</p>
    </el-dialog>
  </div>
</template>

<style scoped>
/* Header logo + text */
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-badge {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #4a63ee 0%, #8b5cf6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 4px 10px rgba(74, 99, 238, 0.35);
}

.logo-text-group {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  min-width: 0;
}

.logo-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.logo-subtext {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

/* Horizontal top navigation */
.topnav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.topnav-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 13px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  text-decoration: none;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.topnav-item:hover {
  background-color: var(--surface-hover);
  color: var(--el-text-color-primary);
}

.topnav-item.active {
  background-color: var(--sidebar-active-bg);
  color: var(--el-color-primary);
  font-weight: 600;
}

.topnav-chevron {
  font-size: 12px;
  transition: transform 0.15s ease;
}

/* Drawer mask + slide-over */
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(10, 12, 18, 0.5);
  backdrop-filter: blur(2px);
  z-index: 99;
}

.mobile-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 300px;
  max-width: 86vw;
  z-index: 100;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  box-shadow: var(--shadow-lg);
}

.mobile-drawer-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  gap: 8px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--sidebar-border);
}

.mobile-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.mobile-nav-item:hover {
  background-color: var(--sidebar-hover-bg);
}

.mobile-nav-item.active {
  background-color: var(--sidebar-active-bg);
  color: var(--el-color-primary);
  font-weight: 600;
}

.mobile-nav-item .el-icon {
  font-size: 17px;
  flex-shrink: 0;
}

.mobile-nav-group {
  display: flex;
  flex-direction: column;
}

.mobile-nav-group-title {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  height: 42px;
  padding: 0 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.mobile-nav-group-title:hover {
  background-color: var(--sidebar-hover-bg);
}

.mobile-nav-group-title .el-icon {
  font-size: 17px;
  flex-shrink: 0;
}

.mobile-nav-chevron {
  margin-left: auto;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  transition: transform 0.2s ease;
}

.mobile-nav-chevron.open {
  transform: rotate(180deg);
}

.mobile-nav-group-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 12px;
}

.mobile-nav-group-body .mobile-nav-item {
  font-size: 13.5px;
}

.mobile-drawer-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-top: 1px solid var(--sidebar-border);
  font-size: 11px;
}

.mobile-drawer-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.mobile-drawer-version {
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.mobile-drawer-link {
  color: var(--el-text-color-placeholder);
  text-decoration: none;
  transition: color 0.15s ease;
}

.mobile-drawer-link:hover {
  color: var(--el-color-primary);
}

@media (max-width: 1280px) {
  .server-pill {
    display: none;
  }
}

/* Server profile switcher */
.server-switcher {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--el-border-color-lighter);
  background: transparent;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.server-switcher:hover {
  background-color: var(--surface-hover);
  color: var(--el-text-color-primary);
  border-color: var(--el-border-color);
}

.server-switcher .el-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.server-switcher-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-switcher-chevron {
  font-size: 11px !important;
}

.server-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 150px;
}

.server-dropdown-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1280px) {
  .server-switcher {
    display: none;
  }
}

.icon-btn.enabled {
  color: var(--el-color-primary);
}

/* Notifications popover */
.notify-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notify-panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.notify-panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12.5px;
  color: var(--el-text-color-regular);
}

.notify-panel-hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--el-text-color-secondary);
}

/* Read-only banner */
.readonly-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 12.5px;
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  border: 1px solid var(--el-color-warning-light-7);
}

.readonly-banner .el-icon {
  font-size: 15px;
  flex-shrink: 0;
}

/* Shortcuts dialog */
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.shortcut-row:last-child {
  border-bottom: none;
}

.shortcut-keys {
  display: inline-flex;
  gap: 4px;
}

.shortcut-keys kbd {
  display: inline-block;
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
  border-bottom-width: 2px;
  background: var(--el-fill-color-light);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--el-text-color-regular);
  text-align: center;
}

.shortcut-hint {
  margin: 12px 0 0;
  font-size: 11.5px;
  color: var(--el-text-color-secondary);
}
</style>
