import { createPinia, setActivePinia } from 'pinia';

import type { DeliveryAddress } from '@brorepack/shared';
import { createOrderInputSchema } from '@brorepack/shared';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDraftStore } from '@/entities/draft';

import { searchAddresses } from '../api/geocoder';
import type { AddressSuggestion } from '../types/address';
import AddressField from './AddressField.vue';

vi.mock('../api/geocoder', () => ({ searchAddresses: vi.fn() }));
vi.mock('@/shared/config', () => ({ IS_ADDRESS_SEARCH_ENABLED: true }));

const searchMock = vi.mocked(searchAddresses);

const FULL_ADDRESS = 'Тверская улица, 7, Москва, 125009, Россия';
const SHORT_ADDRESS = 'Тверская улица, 7';
const LOCATION = { lat: 55.7609, lon: 37.6087 };

const SUGGESTIONS: AddressSuggestion[] = [
  {
    id: '1',
    address: FULL_ADDRESS,
    city: 'Москва',
    location: LOCATION,
    street: 'Тверская улица',
    houseNumber: '7',
    isStreet: false,
    shortAddress: SHORT_ADDRESS,
    details: 'Москва',
  },
  {
    id: '2',
    address: 'Тверская улица, 7, Саратов, Саратовская область, 410012, Россия',
    city: 'Саратов',
    location: { lat: 51.53, lon: 46.03 },
    street: 'Тверская улица',
    houseNumber: '7',
    isStreet: false,
    shortAddress: SHORT_ADDRESS,
    details: 'Саратов, Саратовская область',
  },
];

/** Поле, связанное с черновиком так же, как DeliveryFields на экране оформления */
const mountField = () => {
  const draft = useDraftStore();
  const wrapper = mount(AddressField, {
    props: {
      label: 'Адрес доставки',
      placeholder: 'Город, улица, дом',
      hint: '',
      error: null,
      modelValue: draft.deliveryAddress,
      manual: draft.delivery.isManualAddress,
      'onUpdate:modelValue': (value: DeliveryAddress) => {
        draft.deliveryAddress = value;
        void wrapper.setProps({ modelValue: value });
      },
      'onUpdate:manual': (value: boolean) => {
        draft.delivery.isManualAddress = value;
        void wrapper.setProps({ manual: value });
      },
    },
  });
  return { draft, wrapper, input: wrapper.get('input') };
};

type Field = ReturnType<typeof mountField>;

const typeQuery = async (input: Field['input'], text: string) => {
  await input.setValue(text);
  await vi.advanceTimersByTimeAsync(400);
  await flushPromises();
};

const chooseFirst = async ({ wrapper, input }: Field) => {
  await input.trigger('focus');
  await typeQuery(input, 'тверская 7');
  await wrapper.findAll('[role="option"]')[0]?.trigger('click');
};

const getModeButton = (wrapper: Field['wrapper']) => wrapper.get('.address-field__mode-button');

describe('AddressField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    setActivePinia(createPinia());
    searchMock.mockReset();
    searchMock.mockResolvedValue(SUGGESTIONS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows short addresses with city and puts the chosen full address with coordinates into draft', async () => {
    const field = mountField();
    await field.input.trigger('focus');
    await typeQuery(field.input, 'тверская 7');

    const options = field.wrapper.findAll('[role="option"]');
    expect(options.map((option) => option.get('.address-suggestions__short').text())).toEqual([
      SHORT_ADDRESS,
      SHORT_ADDRESS,
    ]);
    expect(options.map((option) => option.get('.address-suggestions__details').text())).toEqual([
      'Москва',
      'Саратов, Саратовская область',
    ]);
    await options[0]?.trigger('click');

    expect((field.input.element as HTMLInputElement).value).toBe(SHORT_ADDRESS);
    expect(field.draft.deliveryAddress).toEqual({
      address: FULL_ADDRESS,
      city: 'Москва',
      location: LOCATION,
    });
    expect(field.wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('opens like a select: arrow toggles the list, empty field shows what to type', async () => {
    const field = mountField();
    const toggle = field.wrapper.get('.address-field__toggle');

    await toggle.trigger('click');
    expect(field.input.attributes('aria-expanded')).toBe('true');
    expect(field.wrapper.get('[role="status"]').text()).toBe('Начни вводить улицу и номер дома');

    await toggle.trigger('click');
    expect(field.wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('choosing a street puts it into the field and waits for house number', async () => {
    searchMock.mockResolvedValue([
      {
        ...(SUGGESTIONS[0] as AddressSuggestion),
        id: 'street',
        houseNumber: '',
        isStreet: true,
        shortAddress: 'Тверская улица',
      },
    ]);
    const field = mountField();
    await field.input.trigger('focus');
    await typeQuery(field.input, 'тверск');

    const option = field.wrapper.get('[role="option"]');
    expect(option.text()).toContain('допиши номер дома');
    await option.trigger('click');

    expect((field.input.element as HTMLInputElement).value).toBe('Тверская улица, ');
    expect(field.draft.deliveryAddress).toEqual({ address: '', city: '', location: null });
    expect(field.input.attributes('aria-expanded')).toBe('true');
  });

  it('sends full chosen address with coordinates to backend, not the typed query', async () => {
    const field = mountField();
    await chooseFirst(field);

    const delivery = field.draft.orderInput.delivery;
    expect(delivery).toEqual({
      method: 'cdek_pvz',
      city: 'Москва',
      address: FULL_ADDRESS,
      location: LOCATION,
    });
    expect(createOrderInputSchema.shape.delivery.safeParse(delivery).success).toBe(true);
  });

  it('resets address, city and coordinates when text is edited after choosing', async () => {
    const field = mountField();
    await chooseFirst(field);

    await field.input.setValue(`${SHORT_ADDRESS}, кв. 5`);

    expect(field.draft.deliveryAddress).toEqual({ address: '', city: '', location: null });
    await field.wrapper.setProps({ error: 'Укажи адрес или пункт выдачи' });
    expect(field.wrapper.get('[role="alert"]').text()).toBe(
      'Выбери адрес из подсказок или введи вручную',
    );
  });

  it('supports keyboard: arrows move, Enter selects, Escape closes', async () => {
    const field = mountField();
    await field.input.trigger('focus');
    await typeQuery(field.input, 'тверская 7');

    await field.input.trigger('keydown', { key: 'ArrowDown' });
    await field.input.trigger('keydown', { key: 'ArrowDown' });
    const secondId = field.wrapper.findAll('[role="option"]')[1]?.attributes('id');
    expect(field.input.attributes('aria-activedescendant')).toBe(secondId);
    await field.input.trigger('keydown', { key: 'Escape' });
    expect(field.input.attributes('aria-expanded')).toBe('false');

    await field.input.trigger('keydown', { key: 'ArrowDown' });
    await field.input.trigger('keydown', { key: 'Enter' });
    expect(field.draft.delivery.address).toBe(FULL_ADDRESS);
  });

  it('shows search error with retry', async () => {
    searchMock.mockReset();
    searchMock.mockRejectedValueOnce(new Error('503'));
    const field = mountField();
    await field.input.trigger('focus');
    await typeQuery(field.input, 'тверская 7');

    expect(field.wrapper.get('[role="status"]').text()).toContain('Не удалось загрузить подсказки');
    expect(field.draft.delivery.address).toBe('');

    searchMock.mockResolvedValueOnce(SUGGESTIONS.slice(0, 1));
    await field.wrapper.get('.address-suggestions__retry').trigger('click');
    await flushPromises();
    expect(field.wrapper.findAll('[role="option"]')).toHaveLength(1);
  });

  it('manual entry: typed text goes to backend as is, without city and coordinates', async () => {
    const field = mountField();
    await field.input.trigger('focus');
    await typeQuery(field.input, 'Казань, Баумана');
    await getModeButton(field.wrapper).trigger('click');
    searchMock.mockClear();

    await typeQuery(field.input, 'Казань, Баумана, 1, кв. 5');

    expect(searchMock).not.toHaveBeenCalled();
    expect(field.input.attributes('role')).toBeUndefined();
    expect(field.draft.delivery.isManualAddress).toBe(true);
    expect(field.draft.orderInput.delivery).toEqual({
      method: 'cdek_pvz',
      city: '',
      address: 'Казань, Баумана, 1, кв. 5',
      location: null,
    });
  });

  it('switching manual entry off forgets unverified address and searches again', async () => {
    const field = mountField();
    await chooseFirst(field);
    await getModeButton(field.wrapper).trigger('click');
    // Выбранный адрес остался текстом (полным — с городом), но координаты — только у проверенного адреса
    expect((field.input.element as HTMLInputElement).value).toBe(FULL_ADDRESS);
    expect(field.draft.deliveryAddress).toEqual({
      address: FULL_ADDRESS,
      city: '',
      location: null,
    });

    searchMock.mockClear();
    await getModeButton(field.wrapper).trigger('click');
    await vi.advanceTimersByTimeAsync(400);

    expect(field.draft.delivery.isManualAddress).toBe(false);
    expect(field.draft.deliveryAddress).toEqual({ address: '', city: '', location: null });
    expect(searchMock).toHaveBeenCalledWith(
      'тверская 7 москва 125009 россия',
      expect.any(AbortSignal),
    );
  });

  it('shows previously saved address shortened, without searching again', async () => {
    Object.assign(useDraftStore().delivery, {
      address: FULL_ADDRESS,
      city: 'Москва',
      location: LOCATION,
    });
    const field = mountField();
    await field.input.trigger('focus');
    await vi.advanceTimersByTimeAsync(1000);

    expect((field.input.element as HTMLInputElement).value).toBe(SHORT_ADDRESS);
    expect(searchMock).not.toHaveBeenCalled();
  });
});
