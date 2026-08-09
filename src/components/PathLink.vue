<template>
  <router-link v-if="path" :to="{ path: '/paths', query: { q: path } }" class="cell-link">
    {{ path }}
  </router-link>
  <span v-else>-</span>
</template>

<script setup lang="ts">
defineProps<{
  path: string | null | undefined
}>()
</script>
