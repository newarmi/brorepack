import { onScopeDispose, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

import { isAbortError } from '@/shared/api';

import { searchAddresses } from '../api/geocoder';
import {
  ADDRESS_SEARCH_DEBOUNCE_MS,
  ADDRESS_SEARCH_MIN_LENGTH,
  ADDRESS_SUGGESTIONS_LIMIT,
} from '../constants/addressSearch';
import type { AddressSearchStatus, AddressSuggestion } from '../types/address';
import { toGeocoderQuery, toSearchQuery } from '../utils/addressQuery';
import { rankSuggestions } from '../utils/rankSuggestions';

const findSuggestions = async (text: string, signal: AbortSignal): Promise<AddressSuggestion[]> => {
  const found = await searchAddresses(toGeocoderQuery(text), signal);
  return rankSuggestions(found, text).slice(0, ADDRESS_SUGGESTIONS_LIMIT);
};

/**
 * Подсказки адреса по строке запроса: debounce, минимальная длина, отмена прошлого запроса.
 * Запрос приводится к единому виду (toSearchQuery): «ул.», «д.», квартира и пунктуация не влияют
 * на поиск, а правка, не меняющая смысла, не порождает нового запроса. Ответ Photon ранжируем сами.
 * Номер запроса защищает от гонки: ответ на устаревший запрос не перетрёт свежие подсказки,
 * даже если геокодер проигнорировал отмену.
 */
export const useAddressSearch = (query: MaybeRefOrGetter<string>) => {
  const suggestions = shallowRef<AddressSuggestion[]>([]);
  const status = shallowRef<AddressSearchStatus>('idle');

  // Одинаковые запросы не повторяем: публичный Photon ограничивает слишком активных клиентов
  const cache = new Map<string, AddressSuggestion[]>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | null = null;
  let requestId = 0;

  const cancel = (): void => {
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    requestId += 1;
  };

  const search = async (text: string): Promise<void> => {
    cancel();
    const id = requestId;
    controller = new AbortController();
    status.value = 'loading';
    try {
      const found = cache.get(text) ?? (await findSuggestions(text, controller.signal));
      if (id !== requestId) {
        return;
      }
      cache.set(text, found);
      suggestions.value = found;
      status.value = found.length ? 'ready' : 'empty';
    } catch (error) {
      if (isAbortError(error) || id !== requestId) {
        return;
      }
      suggestions.value = [];
      status.value = 'error';
    }
  };

  const getSearchText = (): string => toSearchQuery(toValue(query));

  watch(getSearchText, (text) => {
    cancel();
    if (toGeocoderQuery(text).length < ADDRESS_SEARCH_MIN_LENGTH) {
      suggestions.value = [];
      status.value = 'idle';
      return;
    }
    timer = setTimeout(() => void search(text), ADDRESS_SEARCH_DEBOUNCE_MS);
  });

  // Ошибка бывает только у запроса допустимой длины, поэтому повторяем без проверок
  const retry = (): void => void search(getSearchText());

  onScopeDispose(cancel);

  return { suggestions, status, retry };
};

export default useAddressSearch;
