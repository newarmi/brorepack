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
  border-radius: var(--radius-control);
  background: var(--color-surface-2);
  border: 1px solid var(--color-line);
  box-shadow: 0 12px 32px rgb(0 0 0 / 45%);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 400;
  text-align: center;
  pointer-events: auto;
}

.app-toast--success {
  border-color: var(--color-ok);
}

.app-toast--error {
  border-color: var(--color-danger);
}

.toast-enter-active {
  transition:
    opacity var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out);
}

.toast-leave-active {
  transition:
    opacity var(--duration-fast) var(--ease-in),
    transform var(--duration-fast) var(--ease-in);
}

/* Новый тост заменяет старый: уходящий снимаем из потока, чтобы на миг не встали два тоста друг над другом.
   Абсолютный элемент во flex-контейнере остаётся по центру */
.toast-leave-active {
  position: absolute;
  /* Ширина как в потоке, с учётом полей экрана: иначе текст перенесётся иначе прямо во время ухода */
  max-width: min(440px, calc(100% - 2 * var(--screen-padding)));
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(var(--motion-shift));
}
</style>
