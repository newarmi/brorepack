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
}

const END_EVENTS = ['pointerup', 'pointercancel', 'lostpointercapture', 'touchcancel'];

const createStats = (): GestureProbeStats => {
  return { fps: 0, maxFrameGap: 0, movesPerSecond: 0, maxMoveGap: 0, ends: {} };
};

/** Запускает замер; onUpdate получает сводку раз в секунду. Возвращает функцию остановки */
export const startGestureProbe = (onUpdate: (stats: GestureProbeStats) => void): (() => void) => {
  const total = createStats();
  let frames = 0;
  let moves = 0;
  let maxFrameGap = 0;
  let maxMoveGap = 0;
  let lastFrame = performance.now();
  let lastMove = 0;
  let frameId = 0;

  const frameHandler = (now: number): void => {
    frames += 1;
    maxFrameGap = Math.max(maxFrameGap, now - lastFrame);
    lastFrame = now;
    frameId = requestAnimationFrame(frameHandler);
  };

  const moveHandler = (event: PointerEvent): void => {
    moves += 1;
    if (lastMove && event.buttons) {
      maxMoveGap = Math.max(maxMoveGap, event.timeStamp - lastMove);
    }
    lastMove = event.buttons ? event.timeStamp : 0;
  };

  const endHandler = (event: Event): void => {
    total.ends[event.type] = (total.ends[event.type] ?? 0) + 1;
    lastMove = 0;
  };

  const intervalId = setInterval(() => {
    onUpdate({
      fps: frames,
      maxFrameGap: Math.round(maxFrameGap),
      movesPerSecond: moves,
      maxMoveGap: Math.round(maxMoveGap),
      ends: { ...total.ends },
    });
    frames = 0;
    moves = 0;
    maxFrameGap = 0;
    maxMoveGap = 0;
  }, 1000);

  frameId = requestAnimationFrame(frameHandler);
  document.addEventListener('pointermove', moveHandler, { capture: true, passive: true });
  END_EVENTS.forEach((type) => document.addEventListener(type, endHandler, { capture: true, passive: true }));

  return () => {
    cancelAnimationFrame(frameId);
    clearInterval(intervalId);
    document.removeEventListener('pointermove', moveHandler, { capture: true });
    END_EVENTS.forEach((type) => document.removeEventListener(type, endHandler, { capture: true }));
  };
};
