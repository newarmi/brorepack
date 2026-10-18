import { computed, shallowRef, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

import type { AddressSuggestion } from '../types/address';
import { getSuggestionId } from '../utils/suggestionId';

interface SuggestionListOptions {
  listId: string;
  suggestions: MaybeRefOrGetter<AddressSuggestion[]>;
  /** Есть что показать: идёт поиск, есть результат или ошибка */
  hasContent: MaybeRefOrGetter<boolean>;
  onSelect: (suggestion: AddressSuggestion) => void;
}

/**
 * Открытие списка подсказок и клавиатура по паттерну combobox (WAI-ARIA):
 * фокус остаётся в поле, активный вариант — через aria-activedescendant.
 */
export const useSuggestionList = (options: SuggestionListOptions) => {
  const isOpen = shallowRef(false);
  const activeIndex = shallowRef(-1);

  const isVisible = computed(() => isOpen.value && toValue(options.hasContent));
  const activeId = computed(() =>
    isVisible.value && activeIndex.value >= 0
      ? getSuggestionId(options.listId, activeIndex.value)
      : undefined,
  );

  const open = (): void => {
    isOpen.value = true;
    activeIndex.value = -1;
  };

  const close = (): void => {
    isOpen.value = false;
    activeIndex.value = -1;
  };

  const moveActive = (step: number): void => {
    isOpen.value = true;
    const count = toValue(options.suggestions).length;
    if (count) {
      activeIndex.value = (activeIndex.value + step + count) % count;
    }
  };

  const selectActive = (): void => {
    const suggestion = toValue(options.suggestions)[activeIndex.value];
    if (suggestion) {
      options.onSelect(suggestion);
    }
  };

  const keyHandlers: Record<string, () => void> = {
    ArrowDown: () => moveActive(1),
    ArrowUp: () => moveActive(-1),
    Enter: selectActive,
    Escape: close,
  };

  const keydownHandler = (event: KeyboardEvent): void => {
    const handler = keyHandlers[event.key];
    // Закрытый список открывается только стрелкой вниз, остальные клавиши работают как обычно
    if (!handler || (!isVisible.value && event.key !== 'ArrowDown')) {
      return;
    }
    event.preventDefault();
    handler();
  };

  return { isVisible, activeIndex, activeId, open, close, keydownHandler };
};

export default useSuggestionList;
