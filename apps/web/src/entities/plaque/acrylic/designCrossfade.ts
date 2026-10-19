import { mix, texture, uniform } from 'three/tsl';
import type { Node, Texture } from 'three/webgpu';
import { DataTexture } from 'three/webgpu';

import { DESIGN_TEXTURE } from './config';

export interface DesignCrossfade {
  /** Цвет дизайна (rgba) в точке лицевой грани — для colorNode, opacityNode и т. п. */
  design: Node<'vec4'>;
  /** Новый дизайн: прежний плавно растворяется, как при смене шаблона в CSS-версии */
  setDesignTexture: (designTexture: Texture) => void;
  /** Шаг кроссфейда; true, пока он меняет картинку */
  update: (deltaSeconds: number) => boolean;
  dispose: () => void;
}

/** Пустая прозрачная текстура 1×1 — пока дизайн не нарисован */
const createEmptyTexture = (): DataTexture => {
  const empty = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  empty.needsUpdate = true;
  return empty;
};

/**
 * Два слота «пинг-понг»: новый дизайн кладётся в скрытый слот, а fade переезжает к нему.
 * У слотов всегда разные текстуры: узлы с одной и той же текстурой шейдер склеивает в одну привязку,
 * и тогда показывался бы прежний дизайн
 */
export const createDesignCrossfade = (): DesignCrossfade => {
  const emptyTextures = [createEmptyTexture(), createEmptyTexture()] as const;
  const slots = [texture(emptyTextures[0]), texture(emptyTextures[1])] as const;
  const fade = uniform(0);
  let activeSlot: 0 | 1 = 0;

  const checkEmpty = (slot: 0 | 1): boolean => slots[slot].value === emptyTextures[slot];

  const setDesignTexture = (designTexture: Texture): void => {
    const isFirstDesign = checkEmpty(0) && checkEmpty(1);
    const hiddenSlot = activeSlot === 0 ? 1 : 0;
    // Дизайн, который ушёл раньше, больше не нужен — освобождаем его память на GPU
    if (!checkEmpty(hiddenSlot)) {
      slots[hiddenSlot].value.dispose();
    }
    slots[hiddenSlot].value = designTexture;
    activeSlot = hiddenSlot;
    // Первый дизайн появляется сразу: растворять пока нечего
    if (isFirstDesign) {
      fade.value = activeSlot;
    }
  };

  const update = (deltaSeconds: number): boolean => {
    if (fade.value === activeSlot) {
      return false;
    }
    const step = deltaSeconds / DESIGN_TEXTURE.fadeSeconds;
    fade.value =
      activeSlot === 1 ? Math.min(1, fade.value + step) : Math.max(0, fade.value - step);
    return true;
  };

  const dispose = (): void => {
    new Set([slots[0].value, slots[1].value, ...emptyTextures]).forEach((item) => item.dispose());
  };

  return { design: mix(slots[0], slots[1], fade), setDesignTexture, update, dispose };
};
