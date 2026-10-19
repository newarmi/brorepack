import { PLAQUE_VIEWBOX } from '@brorepack/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bindImageGesture } from './imageGesture';

const createPointerEvent = (type: string, clientX = 0): PointerEvent => {
  return new PointerEvent(type, { pointerId: 1, button: 0, clientX, bubbles: true, cancelable: true });
};

const waitFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

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

  // iOS: захват касания переходит от узла под пальцем к сцене, его lostpointercapture всплывает
  it('keeps dragging when lostpointercapture bubbles up from a child', async () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10));
    gesture.child.dispatchEvent(createPointerEvent('lostpointercapture'));
    gesture.element.dispatchEvent(createPointerEvent('pointermove', 30));
    await waitFrame();

    expect(gesture.onChange).toHaveBeenCalledWith(expect.objectContaining({ x: 120, y: 100 }));
  });

  it('stops dragging when the stage itself loses the capture', async () => {
    const gesture = setup();
    unbind = gesture.unbind;

    gesture.element.dispatchEvent(createPointerEvent('pointerdown', 10));
    gesture.element.dispatchEvent(createPointerEvent('lostpointercapture'));
    gesture.element.dispatchEvent(createPointerEvent('pointermove', 30));
    await waitFrame();

    expect(gesture.onChange).not.toHaveBeenCalled();
  });
});
