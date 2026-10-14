<template>
  <span class="skeleton-block" :style="style" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ width?: string; height?: string; radius?: string }>(), {
  width: '100%',
  height: '16px',
  radius: '8px',
});

const style = computed(() => ({
  width: props.width,
  height: props.height,
  borderRadius: props.radius,
}));
</script>

<style scoped>
.skeleton-block {
  display: block;
  background: linear-gradient(
    90deg,
    var(--color-surface-2) 0%,
    rgb(34 48 77 / 90%) 40%,
    var(--color-surface-2) 80%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 100% 0;
  }

  to {
    background-position: -100% 0;
  }
}
</style>
