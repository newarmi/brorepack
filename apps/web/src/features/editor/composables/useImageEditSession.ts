import { watch } from 'vue';
import { onBeforeRouteLeave, useRouter } from 'vue-router';

import type { PlaqueImageTransform } from '@brorepack/shared';

import { useCustomImageStore } from '@/entities/draft';
import { ROUTE_NAMES } from '@/shared/config';
import { useBackButtonStore } from '@/shared/telegram';

import { pickTransform } from '../utils/imageTransform';

/**
 * Экран правки картинки: правки видны сразу, но сохраняются только по «Готово».
 * Уход другим путём («Назад» Telegram, жест, история браузера) возвращает положение, каким оно было до входа
 */
export const useImageEditSession = () => {
  const customImage = useCustomImageStore();
  const router = useRouter();
  const backButton = useBackButtonStore();
  let initialTransform: PlaqueImageTransform | null = null;
  let isSaved = false;

  // После перезагрузки файл читается из IndexedDB не сразу — запоминаем положение, как только картинка появилась
  watch(
    () => customImage.image,
    (image) => {
      initialTransform ??= image ? pickTransform(image) : null;
    },
    { immediate: true },
  );

  // Картинку удалили или её файл не нашёлся — править нечего
  watch(
    () => customImage.hasImage,
    (hasImage) => {
      if (!hasImage) {
        void router.replace({ name: ROUTE_NAMES.constructor });
      }
    },
    { immediate: true },
  );

  onBeforeRouteLeave(() => {
    if (!isSaved && initialTransform) {
      customImage.setTransform(initialTransform);
    }
  });

  /** «Готово»: оставить правки и вернуться тем же путём, что и кнопка «Назад» */
  const save = (): void => {
    isSaved = true;
    backButton.click();
  };

  return { save };
};

export default useImageEditSession;
