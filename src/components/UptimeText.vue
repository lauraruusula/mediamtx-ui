<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { formatUptime } from '@/composables/useFormatters'

const props = defineProps<{
  started?: string | null
}>()

// formatUptime computes from Date.now(), so it only refreshes when this
// component re-renders. A local 1s tick keeps the displayed uptime live
// without re-rendering the whole layout.
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <span>{{ formatUptime(props.started) }}</span>
</template>
