<template>
  <el-alert v-if="message" type="error" show-icon :closable="false" class="api-error-banner">
    <div class="api-error-content">
      <div class="api-error-text">
        <div class="api-error-title">{{ title }}</div>
        <div class="api-error-message">{{ message }}</div>
      </div>
      <el-button size="small" :loading="loading" @click="$emit('retry')">Retry</el-button>
    </div>
  </el-alert>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message: string
    title?: string
    loading?: boolean
  }>(),
  {
    title: 'Failed to load data',
    loading: false
  }
)

defineEmits<{
  (e: 'retry'): void
}>()
</script>

<style scoped>
.api-error-banner {
  margin-bottom: 16px;
}

.api-error-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.api-error-text {
  min-width: 0;
}

.api-error-title {
  font-weight: 600;
  font-size: 13px;
}

.api-error-message {
  font-size: 12px;
  margin-top: 2px;
  color: var(--el-text-color-secondary);
  overflow-wrap: anywhere;
}
</style>
