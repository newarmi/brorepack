import type { WebGPURenderer } from 'three/webgpu';

export interface FrameLoopOptions {
  renderer: WebGPURenderer;
  /** Элемент на странице: вне экрана кадры не рисуются */
  host: HTMLElement;
  idleFps: number;
  /** Шаг анимаций; isActive — что-то двигается, isDragging — плашку держат пальцем */
  renderFrame: (deltaSeconds: number) => { isActive: boolean; isDragging: boolean };
  render: () => void;
  onResize: () => void;
}

export interface FrameLoop {
  /** Нарисовать следующий кадр, даже если ничего не двигается (новый дизайн, resize) */
  requestRender: () => void;
  stop: () => void;
}

/** Самый длинный учитываемый кадр: после фриза плашка не прыгает, а доезжает плавно */
const MAX_FRAME_SECONDS = 0.1;

/**
 * Цикл кадров через renderer.setAnimationLoop (requestAnimationFrame: в фоне браузер сам его останавливает).
 * Экономит батарею: вне экрана не рисует, в простое — не чаще idleFps,
 * а при prefers-reduced-motion — только когда что-то изменилось
 */
export const startFrameLoop = (options: FrameLoopOptions): FrameLoop => {
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  let isOnScreen = true;
  let isRenderRequested = true;
  let lastTime: number | null = null;
  let lastRenderTime = 0;

  const frameHandler = (time: number): void => {
    if (!isOnScreen) {
      lastTime = null;
      return;
    }
    const deltaSeconds = lastTime === null ? 0 : Math.min(MAX_FRAME_SECONDS, (time - lastTime) / 1000);
    lastTime = time;
    const frame = options.renderFrame(deltaSeconds);
    // Перелив и RGB-кромка зависят от времени: без reduced-motion сцена живая и в покое
    const isLive = frame.isActive || isRenderRequested || !reducedMotion?.matches;
    const minInterval = frame.isDragging || isRenderRequested ? 0 : 1000 / options.idleFps;
    // Допуск в 1 мс: иначе при 60 fps из-за дрожания времени кадры пропускались бы через один
    if (!isLive || time - lastRenderTime < minInterval - 1) {
      return;
    }
    lastRenderTime = time;
    isRenderRequested = false;
    options.render();
  };

  const requestRender = (): void => {
    isRenderRequested = true;
  };

  const resizeObserver = new ResizeObserver(() => {
    options.onResize();
    requestRender();
  });
  resizeObserver.observe(options.host);

  const intersectionObserver = new IntersectionObserver(([entry]) => {
    isOnScreen = entry?.isIntersecting ?? true;
  });
  intersectionObserver.observe(options.host);

  void options.renderer.setAnimationLoop(frameHandler);

  const stop = (): void => {
    void options.renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
  };

  return { requestRender, stop };
};
