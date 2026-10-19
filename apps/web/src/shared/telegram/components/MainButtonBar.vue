<template>
  <!-- Главная кнопка экрана — своя и в браузере, и в Telegram: нативную MainButton рисует сам клиент
       системным шрифтом, и анимировать её текст нельзя. Состояние — в mainButtonStore -->
  <Transition name="main-button-bar">
    <div v-if="mainButton.state.visible" class="main-button-bar">
      <button
        type="button"
        class="main-button-bar__button"
        :disabled="mainButton.state.disabled"
        :aria-busy="mainButton.state.loading || undefined"
        @click="mainButton.click"
      >
        <span
          v-if="mainButton.state.loading"
          class="main-button-bar__spinner spinner"
          aria-hidden="true"
        />
        <!-- Сменилась надпись — буквы «расшифровываются», сменилась сумма — цифры докручиваются -->
        <GlitchText v-else :text="mainButton.state.text" />
        <span v-if="mainButton.state.loading" class="visually-hidden">{{
          mainButton.state.text
        }}</span>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import GlitchText from '@/shared/ui/components/GlitchText.vue';

import { useMainButtonStore } from '../stores/mainButtonStore';

const mainButton = useMainButtonStore();
</script>

<style scoped>
.main-button-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  padding: 8px 12px calc(8px + var(--safe-bottom));
  background: var(--color-bg);
}

.main-button-bar__button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 560px;
  height: var(--main-button-height);
  margin: 0 auto;
  border-radius: var(--radius-control);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: var(--text-base);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.main-button-bar__button:active:not(:disabled) {
  background: var(--color-accent-hi);
  transform: scale(var(--press-scale));
}

.main-button-bar-enter-active {
  transition: transform var(--duration-slow) var(--ease-out);
}

.main-button-bar-leave-active {
  transition: transform var(--duration-base) var(--ease-in);
}

.main-button-bar-enter-from,
.main-button-bar-leave-to {
  transform: translateY(100%);
}

/* Как нативная кнопка в неактивном состоянии: THEME_COLORS.disabled / disabledText */
.main-button-bar__button:disabled {
  background: var(--color-line);
  color: var(--color-faint);
}

.main-button-bar__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: main-button-bar-spin 0.8s linear infinite;
}

@keyframes main-button-bar-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
