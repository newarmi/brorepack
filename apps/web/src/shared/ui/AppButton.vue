<template>
  <button
    :class="classes"
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :aria-busy="props.loading || undefined"
    @click="emits('click', $event)"
  >
    <span v-if="props.loading" class="app-button__spinner" aria-hidden="true" />
    <AppIcon v-else-if="props.icon" :name="props.icon" :size="18" />
    <span class="app-button__label"><slot /></span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { IconName } from './AppIcon.vue';
import AppIcon from './AppIcon.vue';

const emits = defineEmits<{ click: [event: MouseEvent] }>();

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'link';
    type?: 'button' | 'submit';
    icon?: IconName;
    block?: boolean;
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    variant: 'secondary',
    type: 'button',
    icon: undefined,
    block: false,
    loading: false,
    disabled: false,
  },
);

const classes = computed(() => [
  'app-button',
  `app-button--${props.variant}`,
  { 'app-button--block': props.block, 'app-button--loading': props.loading },
]);
</script>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 18px;
  border-radius: var(--radius-control);
  font-size: 15px;
  font-weight: 600;
  transition:
    background-color var(--transition-fast),
    opacity var(--transition-fast),
    transform var(--transition-fast);
}

.app-button:active:not(:disabled) {
  transform: scale(0.98);
}

.app-button:disabled {
  opacity: 0.5;
}

.app-button--block {
  display: flex;
  width: 100%;
}

.app-button--primary {
  background: var(--color-accent);
  color: #fff;
}

.app-button--secondary {
  background: var(--color-bg);
  border: 1px solid var(--color-line);
  color: var(--color-accent-hi);
}

.app-button--secondary:hover:not(:disabled) {
  background: var(--color-surface);
}

.app-button--link {
  min-height: 40px;
  padding: 0 8px;
  color: var(--color-accent-hi);
  font-weight: 500;
}

.app-button--loading {
  opacity: 0.8;
}

.app-button__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: app-button-spin 0.8s linear infinite;
}

@keyframes app-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
