import { describe, expect, it } from 'vitest';

import type { Point } from './imageTransform';
import { createTouchJournal } from './touchJournal';

const createEvent = (type: string, x: number, timeStamp: number): PointerEvent => {
  const event = new PointerEvent(type, { pointerId: 1, clientX: x, clientY: 0 });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  return event;
};

describe('createTouchJournal', () => {
  it('notes when the image stops while the finger keeps moving', () => {
    let image: Point = { x: 100, y: 100 };
    const journal = createTouchJournal(() => image);

    journal.down(createEvent('pointerdown', 0, 0));
    image = { x: 110, y: 100 };
    journal.move(createEvent('pointermove', 10, 16));
    journal.move(createEvent('pointermove', 20, 32));
    journal.end(createEvent('pointerup', 20, 48));

    expect(journal.records).toEqual([
      '#1 pointerup 48мс пальцев 1 · палец 20,0 старт 0,0 · картинка 10,0 · стоп с 32мс (1/2 move) пауза 16мс',
    ]);
  });
});
