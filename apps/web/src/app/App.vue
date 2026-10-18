<template>
  <div class="app" :class="appClasses">
    <DevTelegramChrome v-if="isDevChrome" />
    <main class="app__content">
      <!-- Без key: при смене параметра (заказ №1 → №2) экран не пересоздаётся, анимируется только смена экрана -->
      <RouterView v-slot="{ Component }">
        <Transition :name="pageTransitionName" mode="out-in" @afterLeave="pageLeaveHandler">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <AppToast />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterView } from 'vue-router';

import { DevTelegramChrome, useMainButtonStore, useTelegram } from '@/shared/telegram';
import { AppToast } from '@/shared/ui';

import { pageLeaveHandler, pageTransitionName } from './router/navigation/pageTransition';

const telegram = useTelegram();
const mainButton = useMainButtonStore();

// Вне Telegram рисуем заглушки его шапки и главной кнопки
const isDevChrome = !telegram.isTelegram;

const appClasses = computed(() => ({
  'app--dev': isDevChrome,
  'app--dev-main-button': isDevChrome && mainButton.state.visible,
}));
</script>

<style scoped>
/* Отступы контента — переменными: их же берут экраны на весь вьюпорт (ImageEditorPage) */
.app {
  --toast-offset: 16px;
  --content-top: calc(16px + var(--safe-top) + var(--content-safe-top));
  --content-bottom: calc(24px + var(--safe-bottom));

  min-height: var(--viewport-height);
  overflow-x: clip;
}

.app__content {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: var(--content-top) calc(var(--screen-padding) + var(--safe-right)) var(--content-bottom)
    calc(var(--screen-padding) + var(--safe-left));
}

.app--dev {
  --content-top: calc(var(--dev-header-height) + var(--safe-top) + 16px);
}

.app--dev-main-button {
  --toast-offset: calc(var(--main-button-height) + 28px);
  --content-bottom: calc(var(--main-button-height) + 40px + var(--safe-bottom));
}
</style>
