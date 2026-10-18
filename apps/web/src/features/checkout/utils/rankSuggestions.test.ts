import { describe, expect, it } from 'vitest';

import type { AddressSuggestion } from '../types/address';
import { toSearchQuery } from './addressQuery';
import { rankSuggestions } from './rankSuggestions';

const createSuggestion = (
  street: string,
  houseNumber: string,
  details: string,
): AddressSuggestion => {
  const shortAddress = `${street}, ${houseNumber}`;
  return {
    id: `${shortAddress}|${details}`,
    address: `${shortAddress}, ${details}, Россия`,
    city: details.split(', ')[0] ?? '',
    location: { lat: 55.76, lon: 37.6 },
    street,
    houseNumber,
    isStreet: false,
    shortAddress,
    details,
  };
};

const rank = (suggestions: AddressSuggestion[], text: string): string[] => {
  return rankSuggestions(suggestions, toSearchQuery(text)).map(
    (item) => `${item.shortAddress} (${item.details})`,
  );
};

describe('rankSuggestions', () => {
  // Порядок, в котором их отдал Photon на «москва тверская 7 к1»
  it('puts matching house first even when Photon ranks it lower', () => {
    const suggestions = [
      createSuggestion('Тверская улица', '8 к1', 'Москва'),
      createSuggestion('4-я Тверская-Ямская улица', '16 к1', 'Москва'),
      createSuggestion('Тверская улица', '7', 'Москва'),
    ];
    expect(rank(suggestions, 'Москва Тверская 7к1')[0]).toBe('Тверская улица, 7 (Москва)');
  });

  it('prefers exact house over a number that only contains it', () => {
    // Photon на «москва мира 10»
    const suggestions = [
      createSuggestion('проспект Мира', '14 с10', 'Москва'),
      createSuggestion('проспект Мира', '124 к10', 'Москва'),
      createSuggestion('проспект Мира', '10 с1', 'Москва'),
    ];
    expect(rank(suggestions, 'москва проспект мира 10')[0]).toBe('проспект Мира, 10 с1 (Москва)');
  });

  it('prefers the street named exactly and the city from the query', () => {
    const suggestions = [
      createSuggestion('4-я Тверская-Ямская улица', '7', 'Москва'),
      createSuggestion('Тверская улица', '7', 'Саратов, Саратовская область'),
      createSuggestion('Тверская улица', '7', 'Москва'),
    ];
    expect(rank(suggestions, 'Саратов, ул. Тверская, д. 7')).toEqual([
      'Тверская улица, 7 (Саратов, Саратовская область)',
      'Тверская улица, 7 (Москва)',
      '4-я Тверская-Ямская улица, 7 (Москва)',
    ]);
  });

  it('does not count a word of the street once more for the region', () => {
    // Photon на «тверская 7» с лимитом 20: «Тверская» — и улица, и «Тверская область»
    const suggestions = [
      createSuggestion('Тверская улица', '7', 'Москва'),
      createSuggestion('Тверская площадь', '7', 'Тверь, Тверская область'),
    ];
    expect(rank(suggestions, 'тверская 7')[0]).toBe('Тверская улица, 7 (Москва)');
  });

  it('drops places whose street is unlike the query but forgives one typo', () => {
    // Photon на «тверская»: заведения с «Тверская» в названии стоят на других улицах
    const noise = [
      createSuggestion('улица Петровка', '19 с6', 'Москва'),
      createSuggestion('Кольцевая улица', '68А', 'Тверь, Тверская область'),
    ];
    expect(rank(noise, 'тверская')).toEqual([]);
    const typo = [...noise, createSuggestion('Тверская улица', '7', 'Москва')];
    expect(rank(typo, 'тверкая 7')).toEqual(['Тверская улица, 7 (Москва)']);
  });

  it('prefers the city and street type from the query over exact house elsewhere', () => {
    // Photon на «новосибирск красный 25»: дома 25 на Красном проспекте в OSM нет, есть 25/1
    const suggestions = [
      createSuggestion('Красный переулок', '25', 'Куйбышев, Новосибирская область'),
      createSuggestion('улица Красный Факел', '25', 'Новосибирск, Новосибирская область'),
      createSuggestion('Красный проспект', '25/1', 'Новосибирск, Новосибирская область'),
    ];
    expect(rank(suggestions, 'Новосибирск, Красный пр-т, 25')[0]).toBe(
      'Красный проспект, 25/1 (Новосибирск, Новосибирская область)',
    );
  });

  it('suggests streets only until house number is typed', () => {
    const street = {
      ...createSuggestion('улица Полковника Романова', '', 'Мытищи'),
      shortAddress: 'улица Полковника Романова',
      isStreet: true,
    };
    const house = createSuggestion('улица Полковника Романова', '7', 'Мытищи');
    expect(rank([street], 'полковника ром')).toEqual(['улица Полковника Романова (Мытищи)']);
    expect(rank([street, house], 'полковника романова 7')).toEqual([
      'улица Полковника Романова, 7 (Мытищи)',
    ]);
  });

  it('treats ё as е and keeps Photon order on equal score', () => {
    const suggestions = [
      createSuggestion('Невский проспект', '28', 'Санкт-Петербург'),
      createSuggestion('Невский переулок', '28', 'Кинель, Самарская область'),
      createSuggestion('улица Академика Королёва', '5', 'Москва'),
    ];
    expect(rank(suggestions, 'невский 28')).toEqual([
      'Невский проспект, 28 (Санкт-Петербург)',
      'Невский переулок, 28 (Кинель, Самарская область)',
    ]);
    expect(rank(suggestions, 'королева 5')[0]).toBe('улица Академика Королёва, 5 (Москва)');
  });
});
