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
</template>

<script setup lang="ts">
import AppIcon from '@/shared/ui/components/AppIcon.vue';
import { useToast } from '@/shared/ui/composables/useToast';

import { useBackButtonStore } from '../stores/backButtonStore';

// Имитация нативной шапки и MainButton Telegram — только вне Telegram,
// чтобы весь флоу можно было пройти в обычном браузере.
// Главная кнопка теперь своя и в Telegram — она в MainButtonBar.vue

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
  transition: opacity var(--transition-fast);
}

.dev-chrome__side-button:active {
  opacity: 0.6;
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
</style>
