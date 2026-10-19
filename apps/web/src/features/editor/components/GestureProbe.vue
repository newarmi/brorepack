<template>
  <!-- Временная диагностика: включается пятью касаниями заголовка экрана правки -->
  <div class="gesture-probe">
    <pre class="gesture-probe__text mono">{{ text }}</pre>
    <button class="gesture-probe__copy" type="button" @click="copyHandler">{{ copyLabel }}</button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue';

import { PLAQUE_VIEWBOX } from '@brorepack/shared';

import { useCustomImageStore } from '@/entities/draft';
import { BUILD_ID } from '@/shared/config';
import { describeTelegramClient } from '@/shared/telegram';

import type { GestureProbeStats } from '../utils/gestureProbe';
import { startGestureProbe } from '../utils/gestureProbe';
import { gestureCounters } from '../utils/imageGesture';
import type { Point } from '../utils/imageTransform';

const VISIBLE_RECORDS = 3;

const customImage = useCustomImageStore();
const stats = shallowRef<GestureProbeStats | null>(null);
const copyLabel = shallowRef('Скопировать лог');
let stop: (() => void) | null = null;

// Центр картинки в экранных пикселях: пункты листа → пиксели по рамке плашки
const getImagePoint = (): Point | null => {
  const image = customImage.image;
  const frame = document.querySelector('.image-stage__frame');
  if (!image || !frame) {
    return null;
  }
  const rect = frame.getBoundingClientRect();
  const ratio = rect.width / PLAQUE_VIEWBOX.width;
  return { x: rect.left + image.x * ratio, y: rect.top + image.y * ratio };
};

const buildSummary = (value: GestureProbeStats): string[] => {
  const ends = Object.entries(value.ends).map(([type, count]) => `${type} ${count}`);
  return [
    `build ${BUILD_ID} · tg ${describeTelegramClient()}`,
    `fps ${value.fps} · пауза кадра ${value.maxFrameGap} мс`,
    `move/с ${value.movesPerSecond} · пауза move ${value.maxMoveGap} мс`,
    ends.join(' · '),
    Object.entries(gestureCounters)
      .map(([name, count]) => `${name} ${count}`)
      .join(' · '),
  ];
};

const text = computed(() => {
  const value = stats.value;
  if (!value) {
    return `build ${BUILD_ID}\nзамер…`;
  }
  return [...buildSummary(value), ...value.records.slice(-VISIBLE_RECORDS)].join('\n');
});

const copyHandler = async (): Promise<void> => {
  const value = stats.value;
  const log = value ? [...buildSummary(value), ...value.records].join('\n') : '';
  try {
    await navigator.clipboard.writeText(log);
    copyLabel.value = `Скопировано: ${value?.records.length ?? 0} касаний`;
  } catch {
    copyLabel.value = 'Не скопировалось';
  }
};

onMounted(() => {
  stop = startGestureProbe((value) => {
    stats.value = value;
  }, getImagePoint);
});

onBeforeUnmount(() => stop?.());
</script>

<style scoped>
.gesture-probe {
  position: fixed;
  top: 8px;
  right: 8px;
  left: 8px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  pointer-events: none;
}

.gesture-probe__text {
  max-width: 100%;
  padding: 6px 8px;
  overflow: hidden;
  border-radius: 6px;
  background: rgb(0 0 0 / 75%);
  color: #7cff7c;
  font-size: 10px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.gesture-probe__copy {
  padding: 6px 10px;
  border-radius: 6px;
  background: #7cff7c;
  color: #000;
  font-size: 12px;
  font-weight: 700;
  pointer-events: auto;
}
</style>
