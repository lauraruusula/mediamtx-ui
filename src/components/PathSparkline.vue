<template>
  <div class="path-sparkline" :title="title">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="none"
      :style="{ width: '100%', height }"
    >
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--el-color-primary)" stop-opacity="0.35" />
          <stop offset="100%" stop-color="var(--el-color-primary)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <polyline
        :points="linePoints"
        fill="none"
        stroke="var(--el-color-primary)"
        stroke-width="1.5"
        vector-effect="non-scaling-stroke"
      />
      <polygon :points="areaPoints" :fill="`url(#${gradId})`" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  points: number[]
  width?: number
  height?: number
  title?: string
}>()

const width = computed(() => props.width ?? 120)
const height = computed(() => props.height ?? 32)

// A stable id per-instance for the gradient fill (unique enough for an admin
// page with a handful of sparklines; avoids re-renders colliding on one id).
const gradId = computed(() => `spark-${Math.random().toString(36).slice(2, 8)}`)

const linePoints = computed(() => {
  const pts = props.points
  if (pts.length < 2) return ''
  const max = Math.max(...pts)
  const min = Math.min(...pts)
  const range = max - min || 1
  const step = width.value / (pts.length - 1)
  return pts
    .map((v, i) => {
      const x = (i * step).toFixed(2)
      const y = (height.value - 2 - ((v - min) / range) * (height.value - 4)).toFixed(2)
      return `${x},${y}`
    })
    .join(' ')
})

// Repeats the last point down to the baseline so the fill closes cleanly.
const areaPoints = computed(() => {
  if (!linePoints.value) return ''
  const lastX = width.value.toFixed(2)
  const baseY = (height.value - 2).toFixed(2)
  return `${linePoints.value} ${lastX},${baseY} 0,${baseY}`
})
</script>

<style scoped>
.path-sparkline {
  display: inline-flex;
  align-items: center;
  width: 120px;
  max-width: 100%;
}

.path-sparkline svg {
  display: block;
}
</style>
