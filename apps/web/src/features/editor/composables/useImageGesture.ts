import { computed, onBeforeUnmount, watch } from 'vue';
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

  // Следим только за фактом «картинка есть», а не за её положением: иначе жест перевешивался бы каждый кадр.
  // Именно computed, а не функция в источниках watch: в продакшен-сборке useTemplateRef отдаёт shallowRef,
  // и с ним watch зовёт обработчик при каждом изменении картинки, даже если результат функции тот же.
  // Жест перевешивался с пустым списком пальцев — картинка сдвигалась на первый move и вставала
  const hasImage = computed(() => getImage() !== null);

  watch(
    [elements.target, elements.frame, hasImage],
    ([element, frameElement]) => {
      unbind?.();
      unbind =
        element && frameElement && hasImage.value
          ? bindImageGesture(element, {
              frame: frameElement,
              getTransform,
              onChange: changeHandler,
            })
          : null;
    },
    { immediate: true },
  );

  onBeforeUnmount(() => unbind?.());
};

export default useImageGesture;
