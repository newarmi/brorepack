import type { WebGPURenderer } from 'three/webgpu';

import type { AcrylicQuality } from './config';
import {
  CANVAS_OVERFLOW,
  PLAQUE_SIZE_M,
  PRODUCT_HEIGHT_M,
  QUALITY_PRESETS,
  STAND,
} from './config';
import type { DesignTextureInput } from './designTexture';
import { createDesignTexture } from './designTexture';
import type { FrameLoop } from './frameLoop';
import { startFrameLoop } from './frameLoop';
import { bindRotation } from './interaction';
import type { PlaqueModel } from './plaqueModel';
import { createPlaqueModel } from './plaqueModel';
import type { PooledRenderer } from './rendererPool';
import { rendererPool } from './rendererPool';
import type { AcrylicScene } from './scene';
import { createAcrylicScene } from './scene';

export interface AcrylicViewOptions {
  quality: AcrylicQuality;
  templateColor: string;
  isWebGLForced: boolean;
  /** Сломался GPU-контекст (сворачивание на Android, нехватка памяти) — пора вернуть CSS-версию */
  onFail: () => void;
}

export type DesignInput = Omit<DesignTextureInput, 'displayWidth'>;

export interface AcrylicView {
  isWebGPU: boolean;
  /** Перерисовать дизайн; после первого вызова плашка видна */
  setDesign: (input: DesignInput) => Promise<void>;
  setLit: (isLit: boolean) => void;
  setTemplateColor: (hex: string) => void;
  dispose: () => void;
}

interface ViewParts {
  host: HTMLElement;
  renderer: WebGPURenderer;
  model: PlaqueModel;
  acrylicScene: AcrylicScene;
  quality: AcrylicQuality;
}

const getPixelRatio = (quality: AcrylicQuality): number => {
  return Math.min(window.devicePixelRatio || 1, QUALITY_PRESETS[quality].maxPixelRatio);
};

/** Рендерер из пула; при ошибке место в пуле сразу возвращается */
const acquireRenderer = async (options: AcrylicViewOptions): Promise<PooledRenderer> => {
  try {
    return await rendererPool.acquire({
      isAntialias: QUALITY_PRESETS[options.quality].isAntialias,
      isWebGLForced: options.isWebGLForced,
    });
  } catch (error) {
    rendererPool.release();
    throw error;
  }
};

/**
 * Холст больше места предмета (CANVAS_OVERFLOW, его раскладывает CSS AcrylicPlaque3D).
 * Масштаб — по высоте места: 3D-предмет занимает столько же, сколько CSS-версия
 */
const resizeViewport = (parts: ViewParts): void => {
  const { host } = parts;
  const width = host.clientWidth * (1 + CANVAS_OVERFLOW.x * 2);
  const height = host.clientHeight * (1 + CANVAS_OVERFLOW.y * 2);
  if (width > 0 && height > 0) {
    parts.acrylicScene.setViewport(width, height, PRODUCT_HEIGHT_M / host.clientHeight);
  }
};

const startViewLoop = (parts: ViewParts, rotation: ReturnType<typeof bindRotation>): FrameLoop => {
  return startFrameLoop({
    renderer: parts.renderer,
    host: parts.host,
    idleFps: QUALITY_PRESETS[parts.quality].idleFps,
    renderFrame: (deltaSeconds) => {
      const angles = rotation.update(deltaSeconds);
      parts.model.setRotation(angles);
      const isAnimating = parts.model.update(deltaSeconds);
      return { isActive: angles.isMoving || isAnimating, isDragging: angles.isDragging };
    },
    render: () => parts.renderer.render(parts.acrylicScene.scene, parts.acrylicScene.camera),
    onResize: () => resizeViewport(parts),
  });
};

/** Новый дизайн → текстура → материал. Если экран закрыли, пока текстура рисовалась, — освобождаем её */
const createDesignSetter = (parts: ViewParts, loop: FrameLoop, checkDisposed: () => boolean) => {
  return async (input: DesignInput): Promise<void> => {
    const designTexture = await createDesignTexture(
      // host шириной с подставку, а текстура — на плашку: она уже подставки
      { ...input, displayWidth: (parts.host.clientWidth * PLAQUE_SIZE_M.width) / STAND.width },
      getPixelRatio(parts.quality),
      parts.renderer.getMaxAnisotropy(),
    );
    if (checkDisposed()) {
      designTexture.dispose();
      return;
    }
    parts.model.setDesignTexture(designTexture);
    loop.requestRender();
  };
};

/**
 * 3D-плашка в host: рендерер из пула, сцена, жесты и цикл кадров.
 * host — место предмета в вёрстке, холст рендерера кладётся внутрь него
 */
export const mountAcrylicView = async (
  host: HTMLElement,
  options: AcrylicViewOptions,
): Promise<AcrylicView> => {
  const { renderer, isWebGPU } = await acquireRenderer(options);
  const canvas = renderer.domElement;
  host.append(canvas);
  renderer.setPixelRatio(getPixelRatio(options.quality));

  const model = createPlaqueModel(options.quality, options.templateColor);
  const parts: ViewParts = {
    host,
    renderer,
    model,
    acrylicScene: createAcrylicScene(renderer, model.root),
    quality: options.quality,
  };
  resizeViewport(parts);
  const rotation = bindRotation(canvas);
  const loop = startViewLoop(parts, rotation);

  // Потеря контекста: WebGPU сообщает через onDeviceLost, WebGL — событием холста
  const contextLostHandler = (): void => options.onFail();
  renderer.onDeviceLost = contextLostHandler;
  canvas.addEventListener('webglcontextlost', contextLostHandler);

  let isDisposed = false;
  const dispose = (): void => {
    isDisposed = true;
    loop.stop();
    canvas.removeEventListener('webglcontextlost', contextLostHandler);
    rotation.dispose();
    model.dispose();
    parts.acrylicScene.dispose();
    canvas.remove();
    rendererPool.release();
  };

  const withRender = <T>(action: (value: T) => void) => {
    return (value: T): void => {
      action(value);
      loop.requestRender();
    };
  };

  return {
    isWebGPU,
    setDesign: createDesignSetter(parts, loop, () => isDisposed),
    setLit: withRender(model.setLit),
    setTemplateColor: withRender(model.setTemplateColor),
    dispose,
  };
};
