import { PLAQUE_VIEWBOX } from '@brorepack/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bindImageGesture } from './imageGesture';

const createPointerEvent = (type: string, clientX = 0): PointerEvent => {
  return new PointerEvent(type, {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX,
    bubbles: true,
    cancelable: true,
  });
};

const waitFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

const setup = () => {
  const element = document.createElement('div');
  const child = document.createElement('div');
  element.setPointerCapture = () => {};
  element.append(child);
  document.body.append(element);
  // Рамка шириной в лист: экранный пиксель = пункт
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, PLAQUE_VIEWBOX.width, PLAQUE_VIEWBOX.height),
  );
  const onChange = vi.fn();
  const unbind = bindImageGesture(element, {
    frame: element,
    getTransform: () => ({ x: 100, y: 100, scale: 1, rotation: 0 }),
    onChange,
  });
  return { element, child, onChange, unbind };
};

describe('bindImageGesture', () => {
  let unbind: (() => void) | null = null;

  afterEach(() => {
    unbind?.();
    document.body.innerHTML = '';
  });

  // Telegram на iPhone снимает захват пальца через ~30 мс после начала движения — жест должен продолжиться
  it('keeps dragging after the stage loses pointer capture', async () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10));
    gesture.element.dispatchEvent(createPointerEvent('lostpointercapture'));
    gesture.child.dispatchEvent(createPointerEvent('pointermove', 30));
    await waitFrame();

    expect(gesture.onChange).toHaveBeenCalledWith(expect.objectContaining({ x: 120, y: 100 }));
  });

  // Telegram на iPhone иначе забирает палец под прокрутку веб-вью на первом же сдвиге
  it('cancels touchstart, so iOS does not start scrolling under the finger', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    const event = new Event('touchstart', { bubbles: true, cancelable: true });
    gesture.child.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('keeps following the finger outside the stage', async () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10));
    document.body.dispatchEvent(createPointerEvent('pointermove', 30));
    await waitFrame();

    expect(gesture.onChange).toHaveBeenCalledWith(expect.objectContaining({ x: 120, y: 100 }));
  });

  it('stops dragging after the finger is lifted', async () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10));
    document.body.dispatchEvent(createPointerEvent('pointerup', 10));
    document.body.dispatchEvent(createPointerEvent('pointermove', 30));
    await waitFrame();

    expect(gesture.onChange).not.toHaveBeenCalled();
  });
});
