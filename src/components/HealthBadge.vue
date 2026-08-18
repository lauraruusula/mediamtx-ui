<template>
  <el-tooltip :content="tooltip || info.label" placement="top">
    <span class="health-badge" :class="`health-${info.level}`">
      <span class="health-badge-dot" />
      {{ info.label }}
    </span>
  </el-tooltip>
</template>

<script setup lang="ts">
import type { HealthInfo } from '@/composables/useStreamHealth'

defineProps<{
  info: HealthInfo
  tooltip?: string
}>()
</script>

<style scoped>
.health-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.health-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.health-good {
  color: var(--el-text-color-regular);
}

.health-good .health-badge-dot {
  background: var(--el-color-success);
}

.health-warn {
  color: var(--el-color-warning);
}

.health-warn .health-badge-dot {
  background: var(--el-color-warning);
}

.health-bad {
  color: var(--el-color-danger);
  font-weight: 600;
}

.health-bad .health-badge-dot {
  background: var(--el-color-danger);
}
</style>
