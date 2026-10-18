import type { DeliveryAddress, GeoPoint } from '@brorepack/shared';

/**
 * Вариант из подсказок. В delivery уходят address (полный адрес, собранный из ответа Photon,
 * его получает бэкенд), city и location. Клиент видит shortAddress и details.
 */
export interface AddressSuggestion extends DeliveryAddress {
  id: string;
  location: GeoPoint;
  street: string;
  /** Пустая строка у улицы без дома */
  houseNumber: string;
  /** Улица без дома: её выбор только подставляет улицу в поле, адресом доставки она не становится */
  isStreet: boolean;
  /** «Тверская улица, 7» — главный текст подсказки и текст поля после выбора */
  shortAddress: string;
  /** «Саратов, Саратовская область» — различает одинаковые улицы в разных городах */
  details: string;
}

export type AddressSearchStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
