import { shallowRef } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withSetup } from '@/shared/testing';

import { searchAddresses } from '../api/geocoder';
import type { AddressSuggestion } from '../types/address';
import { useAddressSearch } from './useAddressSearch';

vi.mock('../api/geocoder', () => ({ searchAddresses: vi.fn() }));

const searchMock = vi.mocked(searchAddresses);

const createSuggestion = (shortAddress: string): AddressSuggestion => {
  const [street = '', houseNumber = ''] = shortAddress.split(', ');
  return {
    id: shortAddress,
    address: `${shortAddress}, Москва, Россия`,
    city: 'Москва',
    location: { lat: 55.76, lon: 37.6 },
    street,
    houseNumber,
    isStreet: false,
    shortAddress,
    details: 'Москва',
  };
};

/** Промис, который тест разрешает сам — чтобы управлять порядком ответов */
const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const setup = () => {
  const query = shallowRef('');
  const { result } = withSetup(() => useAddressSearch(query));
  return { query, ...result };
};

describe('useAddressSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    searchMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for debounce and ignores too short queries', async () => {
    searchMock.mockResolvedValue([createSuggestion('Тверская улица, 7')]);
    const search = setup();

    search.query.value = 'Тв';
    await vi.advanceTimersByTimeAsync(1000);
    expect(searchMock).not.toHaveBeenCalled();
    expect(search.status.value).toBe('idle');

    search.query.value = 'Тве';
    await vi.advanceTimersByTimeAsync(100);
    search.query.value = 'Твер';
    await vi.advanceTimersByTimeAsync(400);

    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0]?.[0]).toBe('твер');
    expect(search.status.value).toBe('ready');
    expect(search.suggestions.value).toHaveLength(1);
  });

  it('aborts previous request and never lets a stale response win', async () => {
    const first = createDeferred<AddressSuggestion[]>();
    const second = createDeferred<AddressSuggestion[]>();
    searchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const search = setup();

    search.query.value = 'Тверская';
    await vi.advanceTimersByTimeAsync(400);
    search.query.value = 'Тверская 7';
    await vi.advanceTimersByTimeAsync(400);

    expect((searchMock.mock.calls[0]?.[1] as AbortSignal).aborted).toBe(true);
    second.resolve([createSuggestion('Тверская улица, 7')]);
    await vi.advanceTimersByTimeAsync(0);
    // Геокодер проигнорировал отмену и ответил позже — ответ отбрасывается
    first.resolve([createSuggestion('Тверская улица, 1')]);
    await vi.advanceTimersByTimeAsync(0);

    expect(search.suggestions.value.map((item) => item.shortAddress)).toEqual([
      'Тверская улица, 7',
    ]);
  });

  it('reports empty result and error, retry repeats the search', async () => {
    searchMock.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('503'));
    const search = setup();

    search.query.value = 'Несуществующая';
    await vi.advanceTimersByTimeAsync(400);
    expect(search.status.value).toBe('empty');

    search.query.value = 'Тверская';
    await vi.advanceTimersByTimeAsync(400);
    expect(search.status.value).toBe('error');
    expect(search.suggestions.value).toEqual([]);

    searchMock.mockResolvedValueOnce([createSuggestion('Тверская улица, 7')]);
    search.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(search.status.value).toBe('ready');
  });

  it('sends cleaned query and ranks suggestions: exact street and house first', async () => {
    searchMock.mockResolvedValue([
      createSuggestion('4-я Тверская-Ямская улица, 7'),
      createSuggestion('Тверская улица, 8 к1'),
      createSuggestion('Тверская улица, 7'),
    ]);
    const search = setup();

    search.query.value = 'Москва, ул. Тверская, д. 7, кв. 12';
    await vi.advanceTimersByTimeAsync(400);

    expect(searchMock.mock.calls[0]?.[0]).toBe('москва тверская 7');
    expect(search.suggestions.value.map((item) => item.shortAddress)).toEqual([
      'Тверская улица, 7',
      '4-я Тверская-Ямская улица, 7',
      'Тверская улица, 8 к1',
    ]);
  });

  it('does not search again when edit does not change the meaning', async () => {
    searchMock.mockResolvedValue([createSuggestion('Тверская улица, 7')]);
    const search = setup();

    search.query.value = 'Тверская 7';
    await vi.advanceTimersByTimeAsync(400);
    search.query.value = '  ТВЕРСКАЯ,  д. 7, кв. 5';
    await vi.advanceTimersByTimeAsync(400);

    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(search.status.value).toBe('ready');
  });

  it('serves repeated query from cache', async () => {
    searchMock.mockResolvedValue([createSuggestion('Тверская улица, 7')]);
    const search = setup();

    search.query.value = 'Тверская';
    await vi.advanceTimersByTimeAsync(400);
    search.query.value = 'Тверская 7';
    await vi.advanceTimersByTimeAsync(400);
    search.query.value = 'Тверская';
    await vi.advanceTimersByTimeAsync(400);

    expect(searchMock).toHaveBeenCalledTimes(2);
  });
});
