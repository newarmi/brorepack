import { PLAQUE_VIEWBOX } from '@brorepack/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bindImageGesture } from './imageGesture';

const createPointerEvent = (
  type: string,
  clientX: number,
  options: PointerEventInit = {},
): PointerEvent => {
  return new PointerEvent(type, {
    pointerId: 1,
    button: 0,
    clientX,
    bubbles: true,
    cancelable: true,
    ...options,
  });
};

const setup = () => {
  const element = document.createElement('div');
  const setPointerCapture = vi.fn();
  element.setPointerCapture = setPointerCapture;
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
  return { element, setPointerCapture, onChange, unbind };
};

describe('bindImageGesture', () => {
  let unbind: (() => void) | null = null;

  afterEach(() => {
    unbind?.();
    document.body.innerHTML = '';
  });

  it('follows every move of the finger', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10));
    gesture.element.dispatchEvent(createPointerEvent('pointermove', 30));
    gesture.element.dispatchEvent(createPointerEvent('pointermove', 210));

    expect(gesture.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ x: 300, y: 100 }));
  });

  // Захват: палец может уйти за край сцены, а его события всё равно придут на неё
  it('captures the pointer', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10, { pointerId: 7 }));

    expect(gesture.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it('scales and rotates with two fingers', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 100, { pointerId: 1 }));
    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 200, { pointerId: 2 }));
    gesture.element.dispatchEvent(createPointerEvent('pointermove', 300, { pointerId: 2 }));

    expect(gesture.onChange).toHaveBeenCalledWith(expect.objectContaining({ scale: 2 }));
  });

  it.each(['pointerup', 'pointercancel'])('stops following after %s', (type) => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10));
    gesture.element.dispatchEvent(createPointerEvent(type, 10));
    gesture.element.dispatchEvent(createPointerEvent('pointermove', 30));

    expect(gesture.onChange).not.toHaveBeenCalled();
  });

  // WebKit (Safari, Telegram Desktop) иначе начинает выделять текст рядом при перетаскивании мышью
  it('cancels the default action of pointerdown', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    const event = createPointerEvent('pointerdown', 10);
    gesture.element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores the right mouse button', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(
      createPointerEvent('pointerdown', 10, { pointerType: 'mouse', button: 2 }),
    );
    gesture.element.dispatchEvent(createPointerEvent('pointermove', 30, { pointerType: 'mouse' }));

    expect(gesture.onChange).not.toHaveBeenCalled();
  });
});
