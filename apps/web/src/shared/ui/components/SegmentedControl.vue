<template>
  <fieldset class="segmented">
    <legend :class="props.hideLabel ? 'visually-hidden' : 'section-label'">
      {{ props.label }}
    </legend>
    <div class="segmented__track">
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
import { useId } from 'vue';

import type { SegmentedOption } from '../types/segmented';

const model = defineModel<T>({ required: true });

const props = withDefaults(
  defineProps<{ options: SegmentedOption<T>[]; label: string; hideLabel?: boolean }>(),
  {
    hideLabel: false,
  },
);

const name = `segmented-${useId()}`;
</script>

<style scoped>
.segmented__track {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: 4px;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
}

.segmented__option {
  position: relative;
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
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.segmented__option--active {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
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
