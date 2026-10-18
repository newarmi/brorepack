import { describe, expect, it } from 'vitest';

import { parseSearchQuery, toGeocoderQuery, toSearchQuery } from './addressQuery';

describe('toSearchQuery', () => {
  it('ignores case, punctuation, extra spaces and writes street type in full', () => {
    expect(toSearchQuery('  Москва,   ул. Тверская,  д.7 ')).toBe('москва улица тверская 7');
    expect(toSearchQuery('Москва улица Тверская дом 7')).toBe('москва улица тверская 7');
    expect(toSearchQuery('Иваново пр-т Ленина 10')).toBe('иваново проспект ленина 10');
    expect(toSearchQuery('г. Казань, Баумана')).toBe('казань баумана');
  });

  it('cuts apartment, entrance and floor', () => {
    expect(toSearchQuery('Тверская 7, кв. 12')).toBe('тверская 7');
    expect(toSearchQuery('Тверская 7 подъезд 2 этаж 3')).toBe('тверская 7');
  });

  it('writes building like OSM and keeps hyphens, fractions and ё', () => {
    expect(toSearchQuery('Тверская 8 корп. 1')).toBe('тверская 8 к1');
    expect(toSearchQuery('Тверская 7к1')).toBe('тверская 7 к1');
    expect(toSearchQuery('Мира 10 стр 2')).toBe('мира 10 с2');
    expect(toSearchQuery('1-я Тверская-Ямская 42/8')).toBe('1-я тверская-ямская 42/8');
    expect(toSearchQuery('Королёва 5')).toBe('королёва 5');
  });

  it('turns text without address into empty string', () => {
    expect(toSearchQuery('д.')).toBe('');
    expect(toSearchQuery(' , ')).toBe('');
  });
});

describe('toGeocoderQuery', () => {
  it('drops street type: a wrong type breaks Photon results', () => {
    expect(toGeocoderQuery('иваново улица ленина 10')).toBe('иваново ленина 10');
    expect(toGeocoderQuery('улица')).toBe('');
  });
});

describe('parseSearchQuery', () => {
  it('takes the last number with building as house', () => {
    expect(parseSearchQuery('москва улица 10 августа 36 к1')).toEqual({
      house: '36к1',
      streetType: 'улица',
      words: ['москва', '10', 'августа'],
    });
    expect(parseSearchQuery('1-я тверская-ямская')).toEqual({
      house: '',
      streetType: '',
      words: ['1-я', 'тверская-ямская'],
    });
  });
});
