import { nextTick, shallowRef } from 'vue';

import type { PlaqueImage } from '@brorepack/shared';
import { PLAQUE_VIEWBOX } from '@brorepack/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { withSetup } from '@/shared/testing';

import { getFitScale } from '../utils/imageTransform';
import { useImageGesture } from './useImageGesture';

const createPointerEvent = (type: string, clientX: number): PointerEvent => {
  return new PointerEvent(type, { pointerId: 1, button: 0, clientX, bubbles: true });
};

const createImage = (): PlaqueImage => {
  const size = { width: 400, height: 300 };
  return { href: 'blob:image', ...size, x: 100, y: 100, scale: getFitScale(size), rotation: 0 };
};

const setup = () => {
  const element = document.createElement('div');
  element.setPointerCapture = () => {};
  document.body.append(element);
  // Рамка шириной в лист: экранный пиксель = пункт
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, PLAQUE_VIEWBOX.width, PLAQUE_VIEWBOX.height),
  );
  // В продакшен-сборке useTemplateRef отдаёт именно shallowRef (в dev — readonly-обёртку над ним)
  const target = shallowRef<HTMLElement | null>(element);
  const image = shallowRef<PlaqueImage | null>(createImage());
  const { wrapper } = withSetup(() =>
    useImageGesture(
      { target, frame: target },
      () => image.value,
      (transform) => {
        image.value = { ...createImage(), ...transform };
      },
    ),
  );
  return { element, image, wrapper };
};

describe('useImageGesture', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // Раньше каждое изменение картинки перевешивало жест с пустым списком пальцев:
  // картинка сдвигалась на первый move и вставала, хотя палец шёл дальше
  it('keeps following the finger after the image has moved', async () => {
    const { element, image, wrapper } = setup();

    element.dispatchEvent(createPointerEvent('pointerdown', 10));
    element.dispatchEvent(createPointerEvent('pointermove', 20));
    await nextTick();
    element.dispatchEvent(createPointerEvent('pointermove', 210));

    expect(image.value?.x).toBe(300);
    wrapper.unmount();
  });

  it('does nothing until the image is loaded', () => {
    const { element, image, wrapper } = setup();
    image.value = null;

    element.dispatchEvent(createPointerEvent('pointerdown', 10));
    element.dispatchEvent(createPointerEvent('pointermove', 30));

    expect(image.value).toBeNull();
    wrapper.unmount();
  });

  it('stops listening after unmount', () => {
    const { element, image, wrapper } = setup();
    wrapper.unmount();

    element.dispatchEvent(createPointerEvent('pointerdown', 10));
    element.dispatchEvent(createPointerEvent('pointermove', 30));

    expect(image.value?.x).toBe(100);
  });
});
