<template>
  <!-- Временная диагностика: включается пятью касаниями заголовка экрана правки -->
  <pre class="gesture-probe mono">{{ text }}</pre>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue';

import { BUILD_ID } from '@/shared/config';

import type { GestureProbeStats } from '../utils/gestureProbe';
import { startGestureProbe } from '../utils/gestureProbe';

const stats = shallowRef<GestureProbeStats | null>(null);
let stop: (() => void) | null = null;

const text = computed(() => {
  const value = stats.value;
  if (!value) {
    return `build ${BUILD_ID}\nзамер…`;
  }
  const ends = Object.entries(value.ends)
    .map(([type, count]) => `${type} ${count}`)
    .join('\n');
  return [
    `build ${BUILD_ID}`,
    `fps ${value.fps} · пауза кадра ${value.maxFrameGap} мс`,
    `move/с ${value.movesPerSecond} · пауза move ${value.maxMoveGap} мс`,
    ends,
  ].join('\n');
});

onMounted(() => {
  stop = startGestureProbe((value) => {
    stats.value = value;
  });
});

onBeforeUnmount(() => stop?.());
</script>

<style scoped>
.gesture-probe {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 100;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgb(0 0 0 / 75%);
  color: #7cff7c;
  font-size: 11px;
  line-height: 1.4;
  white-space: pre;
  pointer-events: none;
}
</style>
