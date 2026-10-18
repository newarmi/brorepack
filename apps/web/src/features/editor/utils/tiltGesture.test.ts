import { afterEach, describe, expect, it } from 'vitest';

import { TILT_OPTIONS } from '../constants/tilt';
import { bindTiltGesture } from './tiltGesture';

const createPointerDown = (): PointerEvent => {
  return new PointerEvent('pointerdown', {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    bubbles: true,
    cancelable: true,
  });
};

describe('bindTiltGesture', () => {
  let unbind: (() => void) | null = null;

  afterEach(() => {
    unbind?.();
    document.body.innerHTML = '';
  });

  // WebKit (Safari, Telegram Desktop) иначе начинает выделять текст рядом с плашкой при наклоне мышью
  it('cancels the default action of pointerdown, so dragging does not select text', () => {
    const element = document.createElement('div');
    element.setPointerCapture = () => {};
    document.body.append(element);
    unbind = bindTiltGesture(element, TILT_OPTIONS);

    const event = createPointerDown();
    element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
