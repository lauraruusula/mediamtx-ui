<template>
  <el-drawer v-model="visible" size="440px">
    <template #header>
      <div class="drawer-header">
        <span class="drawer-title">{{ title }}</span>
        <div class="drawer-actions">
          <el-button
            :icon="Refresh"
            circle
            size="small"
            :loading="refreshing"
            aria-label="Refresh details"
            @click="emit('refresh')"
          />
          <slot name="actions" />
        </div>
      </div>
    </template>

    <el-descriptions v-if="rows.length" :column="1" border>
      <el-descriptions-item v-for="row in rows" :key="row.label" :label="row.label">
        <el-tag v-if="row.tag" :type="row.tag.type || 'info'" size="small">
          {{ row.tag.text }}
        </el-tag>
        <template v-else>{{ row.value ?? '—' }}</template>
      </el-descriptions-item>
    </el-descriptions>

    <slot />
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Refresh } from '@element-plus/icons-vue'

export interface DetailRow {
  label: string
  value?: string | number
  tag?: { text: string; type?: 'success' | 'warning' | 'danger' | 'info' | 'primary' }
}

const props = defineProps<{
  modelValue: boolean
  title: string
  rows: DetailRow[]
  refreshing?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'refresh'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})
</script>

<style scoped>
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.drawer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
