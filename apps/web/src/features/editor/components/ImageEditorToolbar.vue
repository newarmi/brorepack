<template>
  <div v-if="image" class="image-toolbar">
    <div class="image-toolbar__zoom">
      <button
        class="image-toolbar__step"
        type="button"
        aria-label="Уменьшить"
        @click="zoomStepHandler(-ZOOM_STEP)"
      >
        −
      </button>
      <input
        class="image-toolbar__slider"
        type="range"
        aria-label="Масштаб"
        :min="ZOOM_PERCENT.min"
        :max="ZOOM_PERCENT.max"
        step="1"
        :value="zoomPercent"
        @input="zoomInputHandler"
      />
      <button
        class="image-toolbar__step"
        type="button"
        aria-label="Увеличить"
        @click="zoomStepHandler(ZOOM_STEP)"
      >
        +
      </button>
      <span class="image-toolbar__value mono">{{ zoomPercent }} %</span>
    </div>

    <div class="image-toolbar__tools">
      <button
        v-for="tool in tools"
        :key="tool.label"
        class="image-toolbar__tool"
        type="button"
        @click="tool.handler"
      >
        <AppIcon :name="tool.icon" :size="22" />
        {{ tool.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { PlaqueImageTransform } from '@brorepack/shared';

import { useCustomImageStore } from '@/entities/draft';
import { useTelegram } from '@/shared/telegram';
import type { IconName } from '@/shared/ui';
import { AppIcon } from '@/shared/ui';

import { IMAGE_LIMITS } from '../constants/image';
import {
  clampTransform,
  getFitScale,
  getFittedTransform,
  pickTransform,
  PLAQUE_CENTER,
} from '../utils/imageTransform';

// Масштаб — в процентах от размера «целиком на плашке»
const ZOOM_PERCENT = { min: IMAGE_LIMITS.minZoom * 100, max: IMAGE_LIMITS.maxZoom * 100 };
const ZOOM_STEP = 10;

const customImage = useCustomImageStore();
const telegram = useTelegram();

const image = computed(() => customImage.image);

const zoomPercent = computed(() =>
  image.value ? Math.round((image.value.scale / getFitScale(image.value)) * 100) : 100,
);

const updateTransform = (changes: Partial<PlaqueImageTransform>): void => {
  if (image.value) {
    const transform = { ...pickTransform(image.value), ...changes };
    customImage.setTransform(clampTransform(transform, image.value));
  }
};

const setZoomPercent = (percent: number): void => {
  if (image.value) {
    updateTransform({ scale: (getFitScale(image.value) * percent) / 100 });
  }
};

const zoomInputHandler = (event: Event): void => {
  setZoomPercent(Number((event.target as HTMLInputElement).value));
};

const zoomStepHandler = (step: number): void => {
  telegram.haptic.selection();
  setZoomPercent(zoomPercent.value + step);
};

const rotateHandler = (): void => {
  telegram.haptic.selection();
  updateTransform({ rotation: (image.value?.rotation ?? 0) + 90 });
};

const centerHandler = (): void => {
  telegram.haptic.selection();
  updateTransform({ ...PLAQUE_CENTER });
};

const resetHandler = (): void => {
  if (image.value) {
    telegram.haptic.impact('light');
    customImage.setTransform(getFittedTransform(image.value));
  }
};

const tools: { label: string; icon: IconName; handler: () => void }[] = [
  { label: 'Повернуть', icon: 'refresh', handler: rotateHandler },
  { label: 'По центру', icon: 'target', handler: centerHandler },
  { label: 'Сбросить', icon: 'undo', handler: resetHandler },
];
</script>

<style scoped>
.image-toolbar {
  display: grid;
  gap: 12px;
}

.image-toolbar__zoom {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 40 × 40 — удобная цель для пальца */
.image-toolbar__step {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  color: var(--color-text);
  font-size: var(--text-lg);
  line-height: 1;
  transition: transform var(--transition-fast);
}

.image-toolbar__step:active {
  transform: scale(var(--press-scale));
}

.image-toolbar__slider {
  flex: 1;
  min-width: 0;
  height: 40px;
  margin: 0;
  accent-color: var(--color-accent);
}

.image-toolbar__value {
  flex-shrink: 0;
  width: 52px;
  font-size: var(--text-sm);
  font-weight: 700;
  text-align: right;
}

.image-toolbar__tools {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.image-toolbar__tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 60px;
  padding: 8px 4px;
  border-radius: var(--radius-control);
  background: var(--color-surface-2);
  color: var(--color-text);
  font-size: var(--text-xs);
  transition:
    background-color var(--transition-fast),
    transform var(--transition-fast);
}

.image-toolbar__tool :deep(svg) {
  color: var(--color-accent-hi);
}

.image-toolbar__tool:active {
  background: var(--color-line);
  transform: scale(var(--press-scale));
}
</style>
