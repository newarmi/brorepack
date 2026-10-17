<template>
  <svg
    class="level-gauge"
    :width="props.size"
    :height="props.size"
    :viewBox="LEVEL_RING_VIEWBOX"
    role="img"
    :aria-label="`${props.level} уровень FACEIT`"
  >
    <path :d="trackPath" fill="var(--color-surface-2)" />
    <path :d="valuePath" :fill="color" />
    <text
      class="level-gauge__value"
      :x="LEVEL_DIGIT.x"
      :y="LEVEL_DIGIT.y"
      :font-size="LEVEL_DIGIT.size"
    >
      {{ props.level }}
    </text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import {
  buildLevelRingPath,
  getLevelColor,
  LEVEL_DIGIT,
  LEVEL_RING_VIEWBOX,
  MAX_FACEIT_LEVEL,
} from '@brorepack/shared';

const props = withDefaults(defineProps<{ level: number; size?: number }>(), { size: 112 });

// Кольцо и цифра — как на плашке: длина дуги растёт с уровнем, подложка — полный ход
const color = computed(() => getLevelColor(props.level));
const trackPath = buildLevelRingPath(MAX_FACEIT_LEVEL);
const valuePath = computed(() => buildLevelRingPath(props.level));
</script>

<style scoped>
.level-gauge {
  flex-shrink: 0;
}

.level-gauge__value {
  fill: var(--color-text);
  font-weight: 700;
  text-anchor: middle;
}
</style>
