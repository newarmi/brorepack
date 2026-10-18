import { afterEach, describe, expect, it, vi } from 'vitest';

import { searchAddresses } from './geocoder';

vi.mock('@/shared/config', () => ({ GEOCODER_URL: 'https://geo.example.com' }));

describe('searchAddresses', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests houses in Russia from configured Photon endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: 'FeatureCollection',
          features: [
            {
              properties: {
                osm_type: 'W',
                osm_id: 1,
                street: 'Тверская улица',
                housenumber: '7',
                city: 'Москва',
              },
              geometry: { coordinates: [37.6, 55.76] },
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    const result = await searchAddresses('Тверская 7', controller.signal);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://geo.example.com/api');
    expect(Object.fromEntries(parsed.searchParams)).toMatchObject({
      q: 'Тверская 7',
      lang: 'default',
      countrycode: 'RU',
      limit: '20',
    });
    expect(parsed.searchParams.getAll('layer')).toEqual(['house', 'street']);
    expect(init.signal).toBe(controller.signal);
    expect(result).toEqual([
      {
        id: 'W1',
        address: 'Тверская улица, 7, Москва',
        city: 'Москва',
        location: { lat: 55.76, lon: 37.6 },
        street: 'Тверская улица',
        houseNumber: '7',
        isStreet: false,
        shortAddress: 'Тверская улица, 7',
        details: 'Москва',
      },
    ]);
  });

  it('throws on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(searchAddresses('Тверская', new AbortController().signal)).rejects.toThrow('503');
  });
});
