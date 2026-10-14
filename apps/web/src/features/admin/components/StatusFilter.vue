<template>
  <fieldset class="status-filter">
    <legend class="visually-hidden">Фильтр по статусу</legend>
    <div class="status-filter__chips">
      <label
        v-for="option in STATUS_FILTER_OPTIONS"
        :key="option.value"
        class="status-filter__chip"
        :class="{ 'status-filter__chip--active': option.value === model }"
      >
        <input v-model="model" class="visually-hidden" type="radio" :name :value="option.value" />
        {{ option.label }}
      </label>
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { useId } from 'vue';

import type { StatusFilterValue } from '../constants/adminOrders';
import { STATUS_FILTER_OPTIONS } from '../constants/adminOrders';

const model = defineModel<StatusFilterValue>({ required: true });

const name = `status-filter-${useId()}`;
</script>

<style scoped>
.status-filter__chips {
  display: flex;
  gap: 8px;
  margin: 0 calc(-1 * var(--screen-padding));
  padding: 2px var(--screen-padding) 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.status-filter__chips::-webkit-scrollbar {
  display: none;
}

.status-filter__chip {
  position: relative;
  flex-shrink: 0;
  padding: 8px 14px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-chip);
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.status-filter__chip--active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-text);
}

.status-filter__chip:has(:focus-visible) {
  outline: 2px solid var(--color-accent-hi);
  outline-offset: 2px;
}
</style>
