import { readJson, sendRequest } from '@/shared/api';
import { GEOCODER_URL } from '@/shared/config';

import {
  ADDRESS_SEARCH_COUNTRY_CODE,
  ADDRESS_SEARCH_LANGUAGE,
  ADDRESS_SEARCH_LAYERS,
  ADDRESS_SEARCH_REQUEST_LIMIT,
} from '../constants/addressSearch';
import type { AddressSuggestion } from '../types/address';
import { mapPhotonResults } from '../utils/photon';

/**
 * Поиск адреса в геокодере Photon: публичный photon.komoot.io или свой экземпляр с тем же API.
 * Это не наш бэкенд, поэтому без call(). Отмена через signal пробрасывается как AbortError.
 */
export const searchAddresses = async (
  query: string,
  signal: AbortSignal,
): Promise<AddressSuggestion[]> => {
  const params = new URLSearchParams({
    q: query,
    limit: String(ADDRESS_SEARCH_REQUEST_LIMIT),
    lang: ADDRESS_SEARCH_LANGUAGE,
    countrycode: ADDRESS_SEARCH_COUNTRY_CODE,
  });
  ADDRESS_SEARCH_LAYERS.forEach((layer) => params.append('layer', layer));
  const response = await sendRequest(`${GEOCODER_URL}/api?${params}`, { signal });
  if (!response.ok) {
    throw new Error(`Geocoder responded with ${response.status}`);
  }
  return mapPhotonResults(await readJson(response));
};
