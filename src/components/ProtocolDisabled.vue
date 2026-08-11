<template>
  <el-card shadow="hover" class="protocol-disabled">
    <div class="protocol-disabled-content">
      <el-icon class="protocol-disabled-icon"><Connection /></el-icon>
      <h2 class="protocol-disabled-title">{{ protocol }} is disabled</h2>
      <p class="protocol-disabled-text">
        The {{ protocol }} server is turned off in the MediaMTX configuration, so this page has no
        data to show. Enable the protocol in System Config and reload to see live
        {{ featureLabel }}.
      </p>
      <el-button type="primary" :icon="Setting" @click="openConfig">Open System Config</el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Connection, Setting } from '@element-plus/icons-vue'

withDefaults(
  defineProps<{
    protocol: string
    featureLabel?: string
  }>(),
  {
    featureLabel: 'activity'
  }
)

const router = useRouter()

const openConfig = () => {
  router.push('/config')
}
</script>

<style scoped>
.protocol-disabled {
  margin-top: 4px;
}

.protocol-disabled-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
}

.protocol-disabled-icon {
  font-size: 40px;
  color: var(--el-text-color-placeholder);
  margin-bottom: 4px;
}

.protocol-disabled-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.protocol-disabled-text {
  margin: 0 0 12px;
  max-width: 420px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}
</style>
