import { WebGPURenderer } from 'three/webgpu';

import { RENDERER_RELEASE_DELAY_MS } from './config';

export interface RendererOptions {
  isAntialias: boolean;
  /** Только для проверки fallback: WebGL 2 даже там, где WebGPU есть */
  isWebGLForced: boolean;
}

export interface PooledRenderer {
  renderer: WebGPURenderer;
  /** false — WebGPU недоступен, и рендерер сам перешёл на WebGL 2 */
  isWebGPU: boolean;
}

export type RendererFactory = (options: RendererOptions) => Promise<PooledRenderer>;

export interface RendererPool {
  acquire: (options: RendererOptions) => Promise<PooledRenderer>;
  release: () => void;
}

/**
 * Настоящий рендерер. WebGPURenderer сам выбирает backend: WebGPU, а без него — WebGL 2.
 * Если нет и WebGL 2, init() падает — тогда остаётся CSS-версия плашки
 */
export const createThreeRenderer: RendererFactory = async (options) => {
  const renderer = new WebGPURenderer({
    alpha: true,
    antialias: options.isAntialias,
    forceWebGL: options.isWebGLForced,
  });
  try {
    await renderer.init();
  } catch (error) {
    void renderer.dispose();
    throw error;
  }
  // Прозрачный фон: плашка ложится на фон сцены из CSS
  renderer.setClearColor(0x000000, 0);
  return { renderer, isWebGPU: 'isWebGPUBackend' in renderer.backend };
};

/**
 * Один рендерер на всё приложение: плашка есть на трёх экранах подряд, и пересоздавать
 * GPU-контекст при каждом переходе дорого (а на iOS число WebGL-контекстов ограничено).
 * Освобождается через releaseDelayMs после ухода последнего пользователя
 */
export const createRendererPool = (
  createRenderer: RendererFactory,
  releaseDelayMs: number,
): RendererPool => {
  let entry: { key: string; promise: Promise<PooledRenderer> } | null = null;
  let users = 0;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;

  const disposeEntry = (): void => {
    const current = entry;
    entry = null;
    current?.promise.then((pooled) => pooled.renderer.dispose()).catch(() => undefined);
  };

  const acquire = (options: RendererOptions): Promise<PooledRenderer> => {
    if (releaseTimer !== null) {
      clearTimeout(releaseTimer);
      releaseTimer = null;
    }
    const key = JSON.stringify(options);
    // Другие настройки (сглаживание, backend) задаются только при создании — пересоздаём, если никто не занят
    if (entry && entry.key !== key && users === 0) {
      disposeEntry();
    }
    if (!entry) {
      const promise = createRenderer(options);
      entry = { key, promise };
      // Ошибку не кэшируем: следующая попытка создаст рендерер заново
      promise.catch(() => {
        if (entry?.promise === promise) {
          entry = null;
        }
      });
    }
    users += 1;
    return entry.promise;
  };

  const release = (): void => {
    users = Math.max(0, users - 1);
    if (users === 0) {
      releaseTimer = setTimeout(disposeEntry, releaseDelayMs);
    }
  };

  return { acquire, release };
};

export const rendererPool = createRendererPool(createThreeRenderer, RENDERER_RELEASE_DELAY_MS);
