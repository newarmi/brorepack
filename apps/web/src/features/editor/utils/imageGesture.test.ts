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

interface FakeTouch {
  identifier: number;
  clientX: number;
  clientY: number;
}

/** touches — пальцы на экране после события, changedTouches — те, что изменились */
const createTouchEvent = (type: string, changed: FakeTouch[], touches = changed): Event => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    changedTouches: { value: changed },
    touches: { value: touches },
  });
  return event;
};

const createTouch = (clientX: number, identifier = 0): FakeTouch => {
  return { identifier, clientX, clientY: 0 };
};

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
  it('keeps dragging after the stage loses pointer capture', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10));
    gesture.element.dispatchEvent(createPointerEvent('lostpointercapture'));
    gesture.child.dispatchEvent(createPointerEvent('pointermove', 30));

    expect(gesture.onChange).toHaveBeenCalledWith(expect.objectContaining({ x: 120, y: 100 }));
  });

  // Telegram на iPhone иначе забирает палец под прокрутку веб-вью на первом же сдвиге
  it('cancels touchstart, so iOS does not start scrolling under the finger', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    const event = createTouchEvent('touchstart', [createTouch(10)]);
    gesture.child.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  // Telegram на iPhone: картинка должна идти за пальцем всё касание, а не только первый кадр
  it('follows every finger move right in the touchmove handler', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.child.dispatchEvent(createTouchEvent('touchstart', [createTouch(10)]));
    gesture.child.dispatchEvent(createTouchEvent('touchmove', [createTouch(30)]));
    gesture.child.dispatchEvent(createTouchEvent('touchmove', [createTouch(210)]));

    expect(gesture.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ x: 300, y: 100 }));
  });

  it('scales and rotates with two fingers', () => {
    const gesture = setup();
    unbind = gesture.unbind;
    const fingers = [createTouch(100, 0), createTouch(200, 1)];

    gesture.child.dispatchEvent(createTouchEvent('touchstart', fingers));
    gesture.child.dispatchEvent(createTouchEvent('touchmove', [createTouch(300, 1)], fingers));

    expect(gesture.onChange).toHaveBeenCalledWith(expect.objectContaining({ scale: 2 }));
  });

  // Палец двигают Touch Events; если бы и Pointer Events двигали, шаг применялся бы дважды
  it('ignores touch pointer events', () => {
    const gesture = setup();
    unbind = gesture.unbind;
    const down = new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true });

    gesture.element.dispatchEvent(down);
    document.body.dispatchEvent(
      new PointerEvent('pointermove', { pointerType: 'touch', clientX: 30 }),
    );

    expect(gesture.onChange).not.toHaveBeenCalled();
  });

  it('stops following after the finger is lifted', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.child.dispatchEvent(createTouchEvent('touchstart', [createTouch(10)]));
    gesture.child.dispatchEvent(createTouchEvent('touchend', [createTouch(10)], []));
    gesture.child.dispatchEvent(createTouchEvent('touchmove', [createTouch(30)]));

    expect(gesture.onChange).not.toHaveBeenCalled();
  });

  it('keeps following the finger outside the stage', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10));
    document.body.dispatchEvent(createPointerEvent('pointermove', 30));

    expect(gesture.onChange).toHaveBeenCalledWith(expect.objectContaining({ x: 120, y: 100 }));
  });

  it('stops dragging after the finger is lifted', () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10));
    document.body.dispatchEvent(createPointerEvent('pointerup', 10));
    document.body.dispatchEvent(createPointerEvent('pointermove', 30));

    expect(gesture.onChange).not.toHaveBeenCalled();
  });
});
