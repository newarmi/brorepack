// Временная диагностика жеста на телефоне: что приходит от касаний и успевает ли основной поток.
// Слушает документ пассивно и ничего не отменяет, поэтому на сам жест не влияет

import type { Point } from './imageTransform';
import { createTouchJournal } from './touchJournal';

export interface GestureProbeStats {
  /** Кадров основного потока за последнюю секунду */
  fps: number;
  /** Самая долгая пауза между кадрами за секунду, мс */
  maxFrameGap: number;
  /** pointermove за секунду */
  movesPerSecond: number;
  /** Самая долгая пауза между pointermove при касании за секунду, мс */
  maxMoveGap: number;
  /** Сколько раз приходили события, обрывающие касание, — за всё время */
  ends: Record<string, number>;
  /** Журнал касаний: палец, картинка, когда она встала */
  records: string[];
}

const END_EVENTS = ['pointerup', 'pointercancel', 'lostpointercapture', 'touchcancel'];
const LISTENER_OPTIONS = { capture: true, passive: true };

/** Замер за одну секунду */
interface Sample {
  frames: number;
  moves: number;
  maxFrameGap: number;
  maxMoveGap: number;
}

const createSample = (): Sample => ({ frames: 0, moves: 0, maxFrameGap: 0, maxMoveGap: 0 });

const buildStats = (
  sample: Sample,
  ends: Record<string, number>,
  records: string[],
): GestureProbeStats => {
  return {
    fps: sample.frames,
    maxFrameGap: Math.round(sample.maxFrameGap),
    movesPerSecond: sample.moves,
    maxMoveGap: Math.round(sample.maxMoveGap),
    ends: { ...ends },
    records: [...records],
  };
};

/** Пассивные слушатели на документе в фазе захвата; возвращает функцию, которая их снимает */
const listenDocument = (handlers: Record<string, (event: PointerEvent) => void>): (() => void) => {
  const entries = Object.entries(handlers) as [string, EventListener][];
  entries.forEach(([type, handler]) => document.addEventListener(type, handler, LISTENER_OPTIONS));
  return () => {
    entries.forEach(([type, handler]) =>
      document.removeEventListener(type, handler, LISTENER_OPTIONS),
    );
  };
};

/**
 * Запускает замер; onUpdate получает сводку раз в секунду. getImagePoint — центр картинки на экране.
 * Возвращает функцию остановки
 */
export const startGestureProbe = (
  onUpdate: (stats: GestureProbeStats) => void,
  getImagePoint: () => Point | null,
): (() => void) => {
  const journal = createTouchJournal(getImagePoint);
  const ends: Record<string, number> = {};
  let sample = createSample();
  let lastFrame = performance.now();
  let lastMove = 0;
  let frameId = 0;

  const frameHandler = (now: number): void => {
    sample.frames += 1;
    sample.maxFrameGap = Math.max(sample.maxFrameGap, now - lastFrame);
    lastFrame = now;
    frameId = requestAnimationFrame(frameHandler);
  };

  const moveHandler = (event: PointerEvent): void => {
    sample.moves += 1;
    journal.move(event);
    if (lastMove && event.buttons) {
      sample.maxMoveGap = Math.max(sample.maxMoveGap, event.timeStamp - lastMove);
    }
    lastMove = event.buttons ? event.timeStamp : 0;
  };

  const endHandler = (event: PointerEvent): void => {
    ends[event.type] = (ends[event.type] ?? 0) + 1;
    lastMove = 0;
    if (event instanceof PointerEvent && event.type !== 'lostpointercapture') {
      journal.end(event);
    }
  };

  const intervalId = setInterval(() => {
    onUpdate(buildStats(sample, ends, journal.records));
    sample = createSample();
  }, 1000);

  frameId = requestAnimationFrame(frameHandler);
  const unlisten = listenDocument({
    pointerdown: journal.down,
    pointermove: moveHandler,
    ...Object.fromEntries(END_EVENTS.map((type) => [type, endHandler])),
  });

  return () => {
    cancelAnimationFrame(frameId);
    clearInterval(intervalId);
    unlisten();
  };
};
