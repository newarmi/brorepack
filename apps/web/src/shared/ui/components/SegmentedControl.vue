<template>
  <fieldset class="segmented">
    <legend :class="props.hideLabel ? 'visually-hidden' : 'section-label'">
      {{ props.label }}
    </legend>
    <div class="segmented__track" :style="trackStyle">
      <!-- Подсветка выбранного пункта одна на всю дорожку и переезжает к новому — видно, откуда куда переключились -->
      <span v-if="activeIndex >= 0" class="segmented__thumb" aria-hidden="true" />
      <label
        v-for="option in props.options"
        :key="option.value"
        class="segmented__option"
        :class="{ 'segmented__option--active': option.value === model }"
      >
        <input v-model="model" class="visually-hidden" type="radio" :name :value="option.value" />
        <span class="segmented__label">{{ option.label }}</span>
        <span v-if="option.hint" class="segmented__hint">{{ option.hint }}</span>
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts" generic="T extends string">
import { computed, useId } from 'vue';

import type { SegmentedOption } from '../types/segmented';

const model = defineModel<T>({ required: true });

const props = withDefaults(
  defineProps<{ options: SegmentedOption<T>[]; label: string; hideLabel?: boolean }>(),
  {
    hideLabel: false,
  },
);

const name = `segmented-${useId()}`;

const activeIndex = computed(() =>
  props.options.findIndex((option) => option.value === model.value),
);
const trackStyle = computed(() => ({
  '--segmented-count': props.options.length,
  '--segmented-index': activeIndex.value,
}));
</script>

<style scoped>
.segmented__track {
  --segmented-gap: 4px;

  position: relative;
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: var(--segmented-gap);
  padding: var(--segmented-gap);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
}

/* Ширина — один столбец сетки, сдвиг — номер столбца × (столбец + зазор) */
.segmented__thumb {
  position: absolute;
  top: var(--segmented-gap);
  bottom: var(--segmented-gap);
  left: var(--segmented-gap);
  width: calc(
    (100% - 2 * var(--segmented-gap) - (var(--segmented-count) - 1) * var(--segmented-gap)) /
      var(--segmented-count)
  );
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-control);
  background: var(--color-accent-soft);
  transform: translateX(calc(var(--segmented-index) * (100% + var(--segmented-gap))));
  transition: transform var(--duration-slow) var(--ease-out);
}

.segmented__option {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  color: var(--color-muted);
  text-align: center;
  cursor: pointer;
  transition:
    color var(--transition-fast),
    transform var(--transition-fast);
}

.segmented__option:active {
  transform: scale(var(--press-scale));
}

.segmented__option--active {
  color: var(--color-text);
}

.segmented__option:has(:focus-visible) {
  outline: 2px solid var(--color-accent-hi);
  outline-offset: 2px;
}

.segmented__label {
  font-size: var(--text-base);
  font-weight: 700;
  line-height: 1.2;
}

.segmented__hint {
  margin-top: 2px;
  color: var(--color-muted);
  font-size: 12px;
  line-height: 1.2;
}
</style>
