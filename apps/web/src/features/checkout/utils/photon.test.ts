import { describe, expect, it } from 'vitest';

import { getShortAddress, mapPhotonResults } from './photon';

// Реальный ответ photon.komoot.io на «москва тверская 7» (lang=default, countrycode=RU)
const TELEGRAPH = {
  type: 'Feature',
  properties: {
    osm_type: 'R',
    osm_id: 451292,
    type: 'house',
    housenumber: '7',
    name: 'Центральный телеграф',
    street: 'Тверская улица',
    district: 'Тверской',
    city: 'Москва',
    state: 'Москва',
    country: 'Россия',
    postcode: '125009',
    countrycode: 'RU',
  },
  geometry: { type: 'Point', coordinates: [37.6116443, 55.7583099] },
};

const createCollection = (...features: unknown[]) => ({ type: 'FeatureCollection', features });

describe('mapPhotonResults', () => {
  it('builds full and short address without object name, takes city and swaps GeoJSON [lon, lat]', () => {
    expect(mapPhotonResults(createCollection(TELEGRAPH))).toEqual([
      {
        id: 'R451292',
        address: 'Тверская улица, 7, Москва, 125009, Россия',
        city: 'Москва',
        location: { lat: 55.7583099, lon: 37.6116443 },
        street: 'Тверская улица',
        houseNumber: '7',
        isStreet: false,
        shortAddress: 'Тверская улица, 7',
        details: 'Москва',
      },
    ]);
  });

  it('adds region when it differs from city and falls back to county for villages', () => {
    const village = {
      properties: {
        housenumber: '5',
        street: 'Садовая улица',
        county: 'Новое',
        state: 'Республика Татарстан',
        country: 'Россия',
      },
      geometry: { coordinates: [49.1, 55.8] },
    };
    const [suggestion] = mapPhotonResults(createCollection(village));
    expect(suggestion?.city).toBe('Новое');
    expect(suggestion?.address).toBe('Садовая улица, 5, Новое, Республика Татарстан, Россия');
    expect(suggestion?.details).toBe('Новое, Республика Татарстан');
  });

  it('drops places without street, house, settlement or coordinates, too long addresses and duplicates', () => {
    const street = {
      ...TELEGRAPH,
      properties: { ...TELEGRAPH.properties, housenumber: undefined },
    };
    // Станция метро: в слое house Photon отдаёт и объекты без номера дома
    const station = {
      ...TELEGRAPH,
      properties: { street: 'Страстной бульвар', name: 'Тверская', city: 'Москва' },
    };
    const noStreet = {
      ...TELEGRAPH,
      properties: { ...TELEGRAPH.properties, osm_id: 4, street: undefined },
    };
    const noCity = {
      ...TELEGRAPH,
      properties: { housenumber: '1', street: 'Тверская улица', country: 'Россия' },
    };
    const noPoint = { ...TELEGRAPH, geometry: { coordinates: [200, 95] } };
    const tooLong = {
      ...TELEGRAPH,
      properties: { ...TELEGRAPH.properties, osm_id: 3, street: 'А'.repeat(300) },
    };
    // Кафе в том же доме — тот же адрес, второй вариант не нужен
    const cafe = { ...TELEGRAPH, properties: { ...TELEGRAPH.properties, osm_id: 2, name: 'Кафе' } };
    // У заведения в том же доме нет индекса — полный адрес другой, но дом тот же
    const shop = {
      ...TELEGRAPH,
      properties: { ...TELEGRAPH.properties, osm_id: 5, postcode: undefined },
    };
    const result = mapPhotonResults(
      createCollection(TELEGRAPH, cafe, shop, station, street, noStreet, noCity, noPoint, tooLong),
    );
    expect(result.map((item) => item.id)).toEqual(['R451292']);
  });

  it('maps street without house: name is the street, segments of one street collapse', () => {
    // Реальный ответ Photon на «полковника романова» со слоем street
    const segment = {
      properties: {
        osm_type: 'W',
        osm_id: 1,
        type: 'street',
        name: 'улица Полковника Романова',
        locality: 'Жилой квартал «Датский квартал»',
        state: 'Московская область',
        country: 'Россия',
      },
      geometry: { coordinates: [37.64, 55.9] },
    };
    const otherSegment = { ...segment, properties: { ...segment.properties, osm_id: 2 } };
    const result = mapPhotonResults(createCollection(segment, otherSegment));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      street: 'улица Полковника Романова',
      houseNumber: '',
      isStreet: true,
      shortAddress: 'улица Полковника Романова',
      details: 'Жилой квартал «Датский квартал», Московская область',
    });
  });

  it('restores short address of chosen suggestion from full address and city', () => {
    const [suggestion] = mapPhotonResults(createCollection(TELEGRAPH));
    expect(suggestion && getShortAddress(suggestion)).toBe('Тверская улица, 7');
    // Ручной адрес без города остаётся как написан
    expect(getShortAddress({ address: 'Москва, Тверская, 7', city: '', location: null })).toBe(
      'Москва, Тверская, 7',
    );
  });

  it('returns empty list for unexpected payload', () => {
    expect(mapPhotonResults(null)).toEqual([]);
    expect(mapPhotonResults({ lang: [{ message: 'Language is not supported' }] })).toEqual([]);
  });
});
