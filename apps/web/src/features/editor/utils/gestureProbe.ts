// Временная диагностика жеста на телефоне: что приходит от касаний и успевает ли основной поток.
// Слушает документ пассивно и ничего не отменяет, поэтому на сам жест не влияет

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
  /** Последний pointercancel: куда и сколько вёл палец от касания до обрыва */
  lastCancel: string;
}

interface Touch {
  x: number;
  y: number;
  time: number;
  lastX: number;
  lastY: number;
}

const END_EVENTS = ['pointerup', 'pointercancel', 'lostpointercapture', 'touchcancel'];
const LISTENER_OPTIONS = { capture: true, passive: true };

/** Где начался каждый палец и где он сейчас — чтобы описать обрыв касания */
const createTouchTracker = () => {
  const touches = new Map<number, Touch>();

  const down = (event: PointerEvent): void => {
    const { clientX: x, clientY: y, timeStamp: time } = event;
    touches.set(event.pointerId, { x, y, time, lastX: x, lastY: y });
  };

  const move = (event: PointerEvent): void => {
    const touch = touches.get(event.pointerId);
    if (touch) {
      touch.lastX = event.clientX;
      touch.lastY = event.clientY;
    }
  };

  const describe = (event: PointerEvent): string => {
    const touch = touches.get(event.pointerId);
    if (!touch) {
      return 'без pointerdown';
    }
    const dx = Math.round(touch.lastX - touch.x);
    const dy = Math.round(touch.lastY - touch.y);
    const time = Math.round(event.timeStamp - touch.time);
    const start = `${Math.round(touch.x)},${Math.round(touch.y)}`;
    return `dx ${dx} dy ${dy} за ${time} мс, старт ${start}, пальцев ${touches.size}`;
  };

  const end = (event: PointerEvent): void => {
    touches.delete(event.pointerId);
  };

  return { down, move, describe, end };
};

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
  lastCancel: string,
): GestureProbeStats => {
  return {
    fps: sample.frames,
    maxFrameGap: Math.round(sample.maxFrameGap),
    movesPerSecond: sample.moves,
    maxMoveGap: Math.round(sample.maxMoveGap),
    ends: { ...ends },
    lastCancel,
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

/** Запускает замер; onUpdate получает сводку раз в секунду. Возвращает функцию остановки */
export const startGestureProbe = (onUpdate: (stats: GestureProbeStats) => void): (() => void) => {
  const tracker = createTouchTracker();
  const ends: Record<string, number> = {};
  let lastCancel = '—';
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
    tracker.move(event);
    if (lastMove && event.buttons) {
      sample.maxMoveGap = Math.max(sample.maxMoveGap, event.timeStamp - lastMove);
    }
    lastMove = event.buttons ? event.timeStamp : 0;
  };

  const endHandler = (event: PointerEvent): void => {
    ends[event.type] = (ends[event.type] ?? 0) + 1;
    lastMove = 0;
    if (event instanceof PointerEvent && event.type === 'pointercancel') {
      lastCancel = tracker.describe(event);
    }
    if (event instanceof PointerEvent && event.type !== 'lostpointercapture') {
      tracker.end(event);
    }
  };

  const intervalId = setInterval(() => {
    onUpdate(buildStats(sample, ends, lastCancel));
    sample = createSample();
  }, 1000);

  frameId = requestAnimationFrame(frameHandler);
  const unlisten = listenDocument({
    pointerdown: tracker.down,
    pointermove: moveHandler,
    ...Object.fromEntries(END_EVENTS.map((type) => [type, endHandler])),
  });

  return () => {
    cancelAnimationFrame(frameId);
    clearInterval(intervalId);
    unlisten();
  };
};
