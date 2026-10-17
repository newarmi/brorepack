<template>
  <header class="dev-chrome__header">
    <button
      v-if="backButton.isVisible"
      type="button"
      class="dev-chrome__side-button"
      @click="backButton.click"
    >
      <AppIcon name="chevron-left" :size="22" />
      Назад
    </button>
    <button v-else type="button" class="dev-chrome__side-button" @click="closeHandler">
      Закрыть
    </button>

    <div class="dev-chrome__title">
      <span class="dev-chrome__name">BROREPACK</span>
      <span class="dev-chrome__subtitle">мини-приложение</span>
    </div>

    <span class="dev-chrome__more" aria-hidden="true">⋯</span>
  </header>

  <div v-if="mainButton.state.visible" class="dev-chrome__bottom">
    <button
      type="button"
      class="dev-chrome__main-button"
      :disabled="mainButton.state.disabled"
      :aria-busy="mainButton.state.loading || undefined"
      @click="mainButton.click"
    >
      <span v-if="mainButton.state.loading" class="dev-chrome__spinner" aria-hidden="true" />
      <span v-else>{{ mainButton.state.text }}</span>
      <span v-if="mainButton.state.loading" class="visually-hidden">{{
        mainButton.state.text
      }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/shared/ui/components/AppIcon.vue';
import { useToast } from '@/shared/ui/composables/useToast';

import { useBackButtonStore } from '../stores/backButtonStore';
import { useMainButtonStore } from '../stores/mainButtonStore';

// Имитация нативной шапки и MainButton Telegram — только вне Telegram,
// чтобы весь флоу можно было пройти в обычном браузере.

const mainButton = useMainButtonStore();
const backButton = useBackButtonStore();
const { showToast } = useToast();

const closeHandler = (): void => {
  showToast('В Telegram здесь мини-приложение закроется');
};
</script>

<style scoped>
.dev-chrome__header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: calc(var(--dev-header-height) + var(--safe-top));
  padding: var(--safe-top) 12px 0;
  background: var(--color-bg-top);
}

.dev-chrome__side-button {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 40px;
  padding: 0 6px;
  border-radius: 10px;
  color: var(--color-accent-hi);
  font-size: 16px;
}

.dev-chrome__title {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
}

.dev-chrome__name {
  font-size: 15px;
  font-weight: 700;
}

.dev-chrome__subtitle {
  color: var(--color-muted);
  font-size: 12px;
}

.dev-chrome__more {
  justify-self: end;
  padding: 0 8px;
  font-size: 22px;
  letter-spacing: -1px;
}

.dev-chrome__bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  padding: 8px 12px calc(8px + var(--safe-bottom));
  background: var(--color-bg);
}

.dev-chrome__main-button {
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
  transition: opacity var(--transition-fast);
}

/* Как нативная кнопка в неактивном состоянии: THEME_COLORS.disabled / disabledText */
.dev-chrome__main-button:disabled {
  background: var(--color-line);
  color: var(--color-faint);
}

.dev-chrome__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: dev-chrome-spin 0.8s linear infinite;
}

@keyframes dev-chrome-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
