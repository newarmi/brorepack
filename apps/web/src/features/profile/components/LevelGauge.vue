<template>
  <svg
    class="level-gauge"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 100 100"
    role="img"
    :aria-label="`${props.level} уровень FACEIT`"
  >
    <circle
      cx="50"
      cy="50"
      :r="RADIUS"
      fill="none"
      stroke="var(--color-surface-2)"
      stroke-width="8"
      stroke-linecap="round"
      :stroke-dasharray="trackDash"
      transform="rotate(135 50 50)"
    />
    <circle
      cx="50"
      cy="50"
      :r="RADIUS"
      fill="none"
      :stroke="color"
      stroke-width="8"
      stroke-linecap="round"
      :stroke-dasharray="valueDash"
      transform="rotate(135 50 50)"
    />
    <text class="level-gauge__value" x="50" y="50" text-anchor="middle" dominant-baseline="central">
      {{ props.level }}
    </text>
  </svg>
</template>

<script setup lang="ts">
import { getLevelColor, MAX_FACEIT_LEVEL } from '@brorepack/shared';
import { computed } from 'vue';

const props = withDefaults(defineProps<{ level: number; size?: number }>(), { size: 112 });

// Дуга 270° с разрывом снизу: окружность повёрнута так, что штрих начинается на 135°
const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_LENGTH = CIRCUMFERENCE * 0.75;

const color = computed(() => getLevelColor(props.level));
const fraction = computed(() => Math.min(1, Math.max(0, props.level / MAX_FACEIT_LEVEL)));
const trackDash = `${ARC_LENGTH} ${CIRCUMFERENCE}`;
const valueDash = computed(() => `${ARC_LENGTH * fraction.value} ${CIRCUMFERENCE}`);
</script>

<style scoped>
.level-gauge {
  flex-shrink: 0;
}

.level-gauge__value {
  fill: var(--color-text);
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 700;
}
</style>
