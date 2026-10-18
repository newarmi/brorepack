<template>
  <div ref="field" class="address-field">
    <TextField
      :modelValue="query"
      :label="props.label"
      name="address"
      :autocomplete="isManual ? 'street-address' : 'off'"
      :enterkeyhint="isManual ? 'done' : 'search'"
      :placeholder="props.placeholder"
      :maxlength="DELIVERY_ADDRESS_MAX"
      :error="errorText"
      :hint="props.hint"
      :inputAttrs="comboboxAttrs"
      @update:modelValue="inputHandler"
      @blur="blurHandler"
    >
      <template v-if="!isManual" #suffix>
        <!-- Стрелка как у селекта; mousedown.prevent — фокус остаётся в поле -->
        <button
          type="button"
          class="address-field__toggle"
          :class="{ 'address-field__toggle--open': isListVisible }"
          tabindex="-1"
          aria-hidden="true"
          @mousedown.prevent
          @click="toggleListHandler"
        >
          <AppIcon name="chevron-down" :size="18" />
        </button>
      </template>
      <template #dropdown>
        <AddressSuggestions
          v-if="isListVisible"
          :id="listId"
          :label="`Подсказки: ${props.label}`"
          :suggestions
          :status
          :activeIndex
          @select="selectHandler"
          @retry="retry"
        />
      </template>
    </TextField>
    <p v-if="IS_ADDRESS_SEARCH_ENABLED" class="address-field__mode">
      <span>{{
        isManual ? 'Адрес без проверки — уточним по телефону' : 'Нет нужного адреса?'
      }}</span>
      <button type="button" class="address-field__mode-button" @click="toggleManualHandler">
        {{ isManual ? 'Найти в подсказках' : 'Ввести вручную' }}
      </button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, toValue, useId, useTemplateRef } from 'vue';

import type { DeliveryAddress } from '@brorepack/shared';
import { DELIVERY_ADDRESS_MAX } from '@brorepack/shared';

import { IS_ADDRESS_SEARCH_ENABLED } from '@/shared/config';
import { useTelegram } from '@/shared/telegram';
import { AppIcon, TextField } from '@/shared/ui';

import { useAddressSearch } from '../composables/useAddressSearch';
import { useSuggestionList } from '../composables/useSuggestionList';
import type { AddressSuggestion } from '../types/address';
import { getShortAddress } from '../utils/photon';
import AddressSuggestions from './AddressSuggestions.vue';

const emits = defineEmits<{ blur: [] }>();
/** Выбранный адрес целиком: полный текст, город и координаты; пустой address — ничего не выбрано */
const selection = defineModel<DeliveryAddress>({ required: true });
/** Клиент выбрал ручной ввод: адрес как написан, без города и координат */
const isManualChosen = defineModel<boolean>('manual', { required: true });

const props = defineProps<{
  label: string;
  placeholder: string;
  hint: string;
  error: string | null;
}>();

const telegram = useTelegram();
const fieldElement = useTemplateRef<HTMLElement>('field');
const listId = `address-${useId()}`;

// Без геокодера подсказок нет — остаётся только ручной ввод
const isManual = computed(() => !IS_ADDRESS_SEARCH_ENABLED || isManualChosen.value);

// Поисковая строка живёт отдельно от выбора; при открытии экрана в ней сохранённый адрес:
// выбранный из подсказок — сокращённым, ручной (без города) — как написан
const query = shallowRef(getShortAddress(toValue(selection)));

const isSelected = computed(
  () =>
    !isManual.value &&
    selection.value.address !== '' &&
    query.value === getShortAddress(selection.value),
);
// Пока адрес выбран или вводится вручную, геокодер не спрашиваем
const { suggestions, status, retry } = useAddressSearch(() =>
  isManual.value || isSelected.value ? '' : query.value,
);

const errorText = computed(() => {
  if (props.error && !isManual.value && !isSelected.value && query.value.trim()) {
    return 'Выбери адрес из подсказок или введи вручную';
  }
  return props.error;
});

const createEmptySelection = (): DeliveryAddress => ({ address: '', city: '', location: null });
const createManualSelection = (text: string): DeliveryAddress => ({
  address: text,
  city: '',
  location: null,
});

const selectHandler = (suggestion: AddressSuggestion): void => {
  telegram.haptic.selection();
  // Улица — не адрес: подставляем её и ищем дальше, когда клиент допишет номер дома
  if (suggestion.isStreet) {
    query.value = `${suggestion.shortAddress}, `;
    list.open();
    return;
  }
  selection.value = {
    address: suggestion.address,
    city: suggestion.city,
    location: suggestion.location,
  };
  query.value = suggestion.shortAddress;
  list.close();
};

const list = useSuggestionList({
  listId,
  suggestions,
  // Как у селекта: открытый список виден и до ввода — с подсказкой, что писать. Выбранный адрес не мешаем
  hasContent: () => status.value !== 'idle' || !isSelected.value,
  onSelect: selectHandler,
});
const { isVisible: isListVisible, activeIndex } = list;

const inputHandler = (text: string): void => {
  query.value = text;
  if (isManual.value) {
    selection.value = createManualSelection(text);
    return;
  }
  list.open();
  // Текст изменили после выбора — старые адрес, город и координаты на бэкенд не уходят
  if (!isSelected.value && selection.value.address) {
    selection.value = createEmptySelection();
  }
};

const toggleManualHandler = (): void => {
  telegram.haptic.selection();
  if (isManual.value) {
    // Обратно к подсказкам: ручной текст не выбран из списка — ищем по нему заново
    isManualChosen.value = false;
    selection.value = createEmptySelection();
    list.open();
    return;
  }
  list.close();
  // Выбранный адрес переходит в ручной ввод полным: сокращённый потерял бы город
  const text = isSelected.value ? selection.value.address : query.value;
  isManualChosen.value = true;
  query.value = text;
  selection.value = createManualSelection(text);
};

const toggleListHandler = (): void => {
  if (isListVisible.value) {
    list.close();
    return;
  }
  // Фокус в поле сам открывает список: обработчик onFocus в comboboxAttrs
  fieldElement.value?.querySelector('input')?.focus();
  list.open();
};

const blurHandler = (): void => {
  list.close();
  emits('blur');
};

const comboboxAttrs = computed(() => {
  if (isManual.value) {
    return undefined;
  }
  return {
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': String(isListVisible.value),
    'aria-controls': listId,
    'aria-activedescendant': list.activeId.value,
    onKeydown: list.keydownHandler,
    onFocus: list.open,
  };
});
</script>

<style scoped>
.address-field__toggle {
  display: flex;
  margin-right: -6px;
  padding: 6px;
  color: var(--color-muted);
  transition: transform var(--transition-fast);
}

.address-field__toggle--open {
  color: var(--color-accent-hi);
  transform: rotate(180deg);
}

.address-field__mode {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  margin-top: 8px;
  color: var(--color-faint);
  font-size: 12px;
}

.address-field__mode-button {
  padding: 2px 0;
  color: var(--color-accent-hi);
  font-size: 13px;
  font-weight: 700;
  transition: opacity var(--transition-fast);
}

.address-field__mode-button:active {
  opacity: 0.6;
}
</style>
