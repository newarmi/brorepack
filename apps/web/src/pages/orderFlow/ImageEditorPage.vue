<template>
  <!-- Экран на всю высоту без прокрутки: свайп по нему двигает картинку, а не страницу -->
  <div class="image-editor-page">
    <header class="image-editor-page__head">
      <h1 class="image-editor-page__title" @click="titleClickHandler">Картинка на плашке</h1>
      <p class="image-editor-page__hint">Двигай пальцем · два пальца — масштаб и поворот</p>
    </header>

    <ImageEditorStage
      class="image-editor-page__stage"
      :design="draft.design"
      :image="customImage.image"
      @transformImage="customImage.setTransform"
    />

    <ImageEditorToolbar />

    <GestureProbe v-if="isProbeVisible" />
  </div>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue';

import { useCustomImageStore, useDraftStore } from '@/entities/draft';
import {
  GestureProbe,
  ImageEditorStage,
  ImageEditorToolbar,
  useImageEditSession,
} from '@/features/editor';
import { useMainButton } from '@/shared/telegram';

const draft = useDraftStore();
const customImage = useCustomImageStore();
const { save } = useImageEditSession();

// Временная диагностика жеста: пять касаний заголовка подряд включают и выключают замер
const PROBE_TAPS = 5;
const isProbeVisible = shallowRef(false);
let titleTaps = 0;
let titleTapTimer = 0;

const titleClickHandler = (): void => {
  titleTaps += 1;
  clearTimeout(titleTapTimer);
  titleTapTimer = window.setTimeout(() => {
    titleTaps = 0;
  }, 1500);
  if (titleTaps === PROBE_TAPS) {
    titleTaps = 0;
    isProbeVisible.value = !isProbeVisible.value;
  }
};

useMainButton({
  text: 'Готово',
  disabled: () => !customImage.image,
  onClick: save,
});
</script>

<style scoped>
/* Поверх обычной раскладки, но под шапкой и главной кнопкой dev-заглушки (z-index 40).
   Отступы — те же, что у app__content (переменные из App.vue) */
.image-editor-page {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 560px;
  margin: 0 auto;
  padding: var(--content-top) calc(var(--screen-padding) + var(--safe-right)) var(--content-bottom)
    calc(var(--screen-padding) + var(--safe-left));
  /* Без «резинового» отскока: на iOS он перехватывал палец у жеста картинки */
  overscroll-behavior: none;
  background: var(--color-bg);
}

.image-editor-page__head {
  text-align: center;
}

.image-editor-page__title {
  font-size: var(--text-md);
  font-weight: 700;
  text-transform: uppercase;
}

.image-editor-page__hint {
  margin-top: 4px;
  color: var(--color-muted);
  font-size: var(--text-sm);
}

/* Сцена забирает всё свободное место между заголовком и инструментами */
.image-editor-page__stage {
  flex: 1;
}
</style>
