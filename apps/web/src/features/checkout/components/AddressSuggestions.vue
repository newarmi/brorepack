<template>
  <div class="address-suggestions appear">
    <ul
      :id="props.id"
      ref="list"
      class="address-suggestions__list"
      role="listbox"
      :aria-label="props.label"
    >
      <li
        v-for="(suggestion, index) in props.suggestions"
        :id="getSuggestionId(props.id, index)"
        :key="suggestion.id"
        class="address-suggestions__option"
        :class="{ 'address-suggestions__option--active': index === props.activeIndex }"
        role="option"
        :aria-selected="index === props.activeIndex"
        @mousedown.prevent
        @click="emits('select', suggestion)"
      >
        <AppIcon
          class="address-suggestions__icon"
          :name="suggestion.isStreet ? 'search' : 'pin'"
          :size="16"
        />
        <span class="address-suggestions__text">
          <span class="address-suggestions__short">{{ suggestion.shortAddress }}</span>
          <span class="address-suggestions__details">
            {{ suggestion.details }}{{ suggestion.isStreet ? ' · допиши номер дома' : '' }}
          </span>
        </span>
      </li>
    </ul>
    <p class="address-suggestions__status" :class="{ 'visually-hidden': isReady }" role="status">
      {{ statusText }}
      <button
        v-if="props.status === 'error'"
        type="button"
        class="address-suggestions__retry"
        @mousedown.prevent
        @click="emits('retry')"
      >
        Повторить
      </button>
    </p>
    <p class="address-suggestions__attribution">
      Данные ©
      <a :href="OSM_COPYRIGHT_URL" target="_blank" rel="noopener noreferrer"
        >участники OpenStreetMap</a
      >
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';

import { AppIcon } from '@/shared/ui';

import { OSM_COPYRIGHT_URL } from '../constants/addressSearch';
import type { AddressSearchStatus, AddressSuggestion } from '../types/address';
import { getSuggestionId } from '../utils/suggestionId';

const emits = defineEmits<{ select: [suggestion: AddressSuggestion]; retry: [] }>();

const props = defineProps<{
  id: string;
  label: string;
  suggestions: AddressSuggestion[];
  status: AddressSearchStatus;
  activeIndex: number;
}>();

const listElement = useTemplateRef<HTMLElement>('list');

const STATUS_TEXT: Record<AddressSearchStatus, string> = {
  idle: 'Начни вводить улицу и номер дома',
  loading: 'Ищем адрес…',
  ready: '',
  empty: 'Ничего не нашли — уточни улицу и дом',
  error: 'Не удалось загрузить подсказки.',
};

const isReady = computed(() => props.status === 'ready');
// Для экранного диктора при готовых подсказках проговариваем их число
const statusText = computed(() =>
  isReady.value ? `Найдено адресов: ${props.suggestions.length}` : STATUS_TEXT[props.status],
);

// Список прокручивается внутри: вариант, выбранный стрелками, держим в видимой части
watch(
  () => props.activeIndex,
  (index) => {
    const option = listElement.value?.children[index];
    option?.scrollIntoView({ block: 'nearest' });
  },
);
</script>

<style scoped>
/* Выпадает поверх формы под рамкой поля, как список у селекта */
.address-suggestions {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 20;
  overflow: hidden;
  background: var(--color-surface-2);
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-control);
  box-shadow: 0 16px 40px rgb(0 0 0 / 55%);
}

.address-suggestions__list {
  max-height: 264px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.address-suggestions__list:empty {
  display: none;
}

.address-suggestions__option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 14px;
  color: var(--color-text);
  font-size: 14px;
  line-height: 1.35;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.address-suggestions__option--active,
.address-suggestions__option:hover,
.address-suggestions__option:active {
  background: var(--color-accent-soft);
}

.address-suggestions__icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--color-faint);
}

.address-suggestions__option--active .address-suggestions__icon {
  color: var(--color-accent-hi);
}

.address-suggestions__text {
  min-width: 0;
}

.address-suggestions__short {
  display: block;
}

.address-suggestions__details {
  display: block;
  margin-top: 2px;
  color: var(--color-muted);
  font-size: 12px;
}

.address-suggestions__status {
  padding: 12px 14px;
  color: var(--color-muted);
  font-size: 14px;
}

.address-suggestions__retry {
  color: var(--color-accent-hi);
  font-weight: 700;
}

.address-suggestions__attribution {
  padding: 6px 14px;
  border-top: 1px solid var(--color-line);
  color: var(--color-faint);
  font-size: 11px;
}

.address-suggestions__attribution a {
  color: inherit;
  text-decoration: underline;
}
</style>
