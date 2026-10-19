import { onBeforeUnmount, onMounted } from 'vue';
import type { Ref } from 'vue';

import type { PlaqueImage, PlaqueImageTransform } from '@brorepack/shared';

import { bindImageGesture } from '../utils/imageGesture';
import { clampTransform, pickTransform } from '../utils/imageTransform';

/**
 * Жесты над картинкой клиента: обработчики висят на области `target` (палец не обязан попасть в плашку),
 * координаты считаются по рамке плашки `frame`. Положение ограничивается здесь — за край картинку не утащить
 */
export const useImageGesture = (
  elements: { target: Readonly<Ref<HTMLElement | null>>; frame: Readonly<Ref<HTMLElement | null>> },
  getImage: () => PlaqueImage | null,
  onChange: (transform: PlaqueImageTransform) => void,
) => {
  let unbind: (() => void) | null = null;

  // Картинки может ещё не быть (файл читается из IndexedDB) — тогда жест ничего не меняет
  const changeHandler = (transform: PlaqueImageTransform): void => {
    const image = getImage();
    if (image) {
      onChange(clampTransform(transform, image));
    }
  };

  const getTransform = (): PlaqueImageTransform => {
    const image = getImage();
    return image ? pickTransform(image) : { x: 0, y: 0, scale: 1, rotation: 0 };
  };

  // Один раз на всё время жизни экрана: сцена и рамка есть в разметке всегда.
  // Раньше жест перевешивался из watch, и в продакшен-сборке это происходило на каждом сдвиге картинки:
  // новый жест не знал о пальце на экране, и картинка вставала
  onMounted(() => {
    const target = elements.target.value;
    const frame = elements.frame.value;
    if (target && frame) {
      unbind = bindImageGesture(target, { frame, getTransform, onChange: changeHandler });
    }
  });

  onBeforeUnmount(() => unbind?.());
};

export default useImageGesture;
