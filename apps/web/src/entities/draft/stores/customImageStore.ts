import { computed, shallowRef, watch } from 'vue';
import { defineStore } from 'pinia';

import type { PlaqueImage, PlaqueImageTransform } from '@brorepack/shared';

import type { CustomImagePlacement } from '../types/customImage';
import { deleteDraftImage, readDraftImage, writeDraftImage } from '../utils/imageStorage';
import { readImagePlacement, writeImagePlacement } from '../utils/storage';

/** Картинка клиента на «Своём дизайне»: живёт столько же, сколько черновик, на сервер не уходит */
export const useCustomImageStore = defineStore('customImage', () => {
  const placement = shallowRef<CustomImagePlacement | null>(readImagePlacement());
  // Ссылка blob: на файл в памяти вкладки — только для показа, никуда не сохраняется
  const url = shallowRef<string | null>(null);

  watch(placement, writeImagePlacement);

  /** Картинка выбрана; файл после перезагрузки может ещё читаться из IndexedDB */
  const hasImage = computed(() => placement.value !== null);

  /** В виде, который понимает renderPlaqueSvg; null — пока файла нет */
  const image = computed<PlaqueImage | null>(() => {
    if (!placement.value || !url.value) {
      return null;
    }
    const { width, height, transform } = placement.value;
    return { href: url.value, width, height, ...transform };
  });

  const showFile = (blob: Blob | null): void => {
    if (url.value) {
      URL.revokeObjectURL(url.value);
    }
    url.value = blob ? URL.createObjectURL(blob) : null;
  };

  const setImage = (blob: Blob, value: CustomImagePlacement): void => {
    showFile(blob);
    placement.value = value;
    void writeDraftImage(blob);
  };

  const setTransform = (transform: PlaqueImageTransform): void => {
    if (placement.value) {
      placement.value = { ...placement.value, transform };
    }
  };

  const removeImage = (): void => {
    showFile(null);
    placement.value = null;
    void deleteDraftImage();
  };

  /** После перезагрузки достаём файл из IndexedDB; если его нет — забываем и положение */
  const restoreImage = async (): Promise<void> => {
    const blob = placement.value ? await readDraftImage() : null;
    // Пока читали, клиент мог загрузить новую картинку
    if (url.value) {
      return;
    }
    if (blob) {
      showFile(blob);
      return;
    }
    removeImage();
  };

  void restoreImage();

  return { hasImage, image, setImage, setTransform, removeImage };
});
