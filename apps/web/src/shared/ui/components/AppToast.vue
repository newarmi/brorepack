<template>
  <div class="app-toast-region" aria-live="polite" aria-atomic="true">
    <Transition name="toast">
      <button
        v-if="toast"
        :key="toast.id"
        type="button"
        class="app-toast"
        :class="`app-toast--${toast.tone}`"
        @click="hideToast"
      >
        {{ toast.text }}
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '../composables/useToast';

const { toast, hideToast } = useToast();
</script>

<style scoped>
.app-toast-region {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--toast-offset, 16px) + var(--safe-bottom));
  z-index: 60;
  display: flex;
  justify-content: center;
  padding: 0 var(--screen-padding);
  pointer-events: none;
}

.app-toast {
  max-width: 440px;
  padding: 12px 16px;
  border-radius: 14px;
  background: var(--color-surface-2);
  border: 1px solid var(--color-line);
  box-shadow: 0 12px 32px rgb(0 0 0 / 45%);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  pointer-events: auto;
}

.app-toast--success {
  border-color: rgb(52 211 153 / 45%);
}

.app-toast--error {
  border-color: rgb(255 92 112 / 55%);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
