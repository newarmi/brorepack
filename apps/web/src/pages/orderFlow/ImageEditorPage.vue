<template>
  <!-- Экран на всю высоту без прокрутки: свайп по нему двигает картинку, а не страницу -->
  <div class="image-editor-page">
    <header class="image-editor-page__head">
      <h1 class="image-editor-page__title">Картинка на плашке</h1>
      <p class="image-editor-page__hint">Двигай пальцем · два пальца — масштаб и поворот</p>
    </header>

    <ImageEditorStage
      class="image-editor-page__stage"
      :design="draft.design"
      :image="customImage.image"
      @transformImage="customImage.setTransform"
    />

    <ImageEditorToolbar />
  </div>
</template>

<script setup lang="ts">
import { useCustomImageStore, useDraftStore } from '@/entities/draft';
import { ImageEditorStage, ImageEditorToolbar, useImageEditSession } from '@/features/editor';
import { useMainButton } from '@/shared/telegram';

const draft = useDraftStore();
const customImage = useCustomImageStore();
const { save } = useImageEditSession();

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
