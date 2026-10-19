import { nextTick, shallowRef } from 'vue';

import type { PlaqueImage } from '@brorepack/shared';
import { PLAQUE_VIEWBOX } from '@brorepack/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { withSetup } from '@/shared/testing';

import { getFitScale } from '../utils/imageTransform';
import { useImageGesture } from './useImageGesture';

const createTouchEvent = (type: string, clientX: number): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touches = [{ identifier: 0, clientX, clientY: 0 }];
  Object.defineProperties(event, {
    changedTouches: { value: touches },
    touches: { value: touches },
  });
  return event;
};

const createImage = (): PlaqueImage => {
  const size = { width: 400, height: 300 };
  return { href: 'blob:image', ...size, x: 100, y: 100, scale: getFitScale(size), rotation: 0 };
};

const setup = () => {
  const element = document.createElement('div');
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

    element.dispatchEvent(createTouchEvent('touchstart', 10));
    element.dispatchEvent(createTouchEvent('touchmove', 20));
    await nextTick();
    element.dispatchEvent(createTouchEvent('touchmove', 210));

    expect(image.value?.x).toBe(300);
    wrapper.unmount();
  });
});
