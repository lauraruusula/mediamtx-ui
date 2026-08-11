import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue'),
      meta: { title: 'Dashboard' }
    },
    {
      path: '/paths',
      name: 'paths',
      component: () => import('@/views/Paths.vue'),
      meta: { title: 'Path Status' }
    },
    {
      path: '/paths/config',
      name: 'pathsConfig',
      component: () => import('@/views/PathsConfig.vue'),
      meta: { title: 'Path Config' }
    },
    {
      path: '/rtsp/connections',
      name: 'rtspConnections',
      component: () => import('@/views/RtspConnections.vue'),
      meta: { title: 'RTSP Connections' }
    },
    {
      path: '/rtsp/sessions',
      name: 'rtspSessions',
      component: () => import('@/views/RtspSessions.vue'),
      meta: { title: 'RTSP Sessions' }
    },
    {
      path: '/rtmp/connections',
      name: 'rtmpConnections',
      component: () => import('@/views/RtmpConnections.vue'),
      meta: { title: 'RTMP Connections' }
    },
    {
      path: '/webrtc/sessions',
      name: 'webrtcSessions',
      component: () => import('@/views/WebRTCSessions.vue'),
      meta: { title: 'WebRTC Sessions' }
    },
    {
      path: '/hls/muxers',
      name: 'hlsMuxers',
      component: () => import('@/views/HlsMuxers.vue'),
      meta: { title: 'HLS Muxers' }
    },
    {
      path: '/srt/connections',
      name: 'srtConnections',
      component: () => import('@/views/SrtConnections.vue'),
      meta: { title: 'SRT Connections' }
    },
    {
      path: '/recordings',
      name: 'recordings',
      component: () => import('@/views/Recordings.vue'),
      meta: { title: 'Recordings' }
    },
    {
      path: '/config',
      name: 'config',
      component: () => import('@/views/Config.vue'),
      meta: { title: 'System Config' }
    },
    {
      // Unknown URLs (typos, stale bookmarks) fall back to the dashboard
      // instead of a blank page.
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

router.beforeEach(to => {
  document.title = `${to.meta.title || 'MediaMTX'} - MediaMTX Admin`
})

export default router
