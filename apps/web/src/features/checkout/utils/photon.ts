import type { DeliveryAddress, GeoPoint } from '@brorepack/shared';
import { DELIVERY_ADDRESS_MAX } from '@brorepack/shared';

import type { AddressSuggestion } from '../types/address';

interface PhotonProperties {
  osm_type?: string;
  osm_id?: number;
  /** house — дом или заведение, street — улица; название улицы тогда в name */
  type?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  locality?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface PhotonFeature {
  properties?: PhotonProperties;
  geometry?: { coordinates?: unknown };
}

// Населённый пункт: у сёл и деревень поля city бывает нет
const CITY_KEYS = ['city', 'locality', 'county', 'state'] as const;

const getCity = (properties: PhotonProperties): string => {
  const key = CITY_KEYS.find((name) => properties[name]?.trim());
  return key ? (properties[key]?.trim() ?? '') : '';
};

/** GeoJSON хранит точку как [долгота, широта] */
const getLocation = (coordinates: unknown): GeoPoint | null => {
  if (!Array.isArray(coordinates)) {
    return null;
  }
  const [lon, lat] = coordinates.map(Number);
  if (lat === undefined || lon === undefined || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return null;
  }
  return { lat, lon };
};

/**
 * Photon не отдаёт готовую строку адреса — собираем полную сами:
 * «Тверская улица, 7, Москва, 125009, Россия». Регион — если он не совпадает с городом.
 * Название объекта (кафе, магазин в доме) не берём: для доставки оно не нужно,
 * а без него несколько заведений в одном доме схлопываются в один вариант.
 */
export const buildFullAddress = (properties: PhotonProperties, city: string): string => {
  const { housenumber, state, postcode, country } = properties;
  const parts = [
    getStreet(properties),
    housenumber,
    city,
    state !== city ? state : undefined,
    postcode,
    country,
  ];
  return joinParts(parts);
};

const joinParts = (parts: (string | undefined)[]): string => {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
};

/**
 * Сокращённый адрес выбранного варианта — начало полного адреса до города (см. buildFullAddress).
 * Его не храним отдельно: в черновик и на бэкенд уходят только address, city и location.
 */
export const getShortAddress = ({ address, city }: DeliveryAddress): string => {
  const cityIndex = city ? address.indexOf(`, ${city}`) : -1;
  return cityIndex > 0 ? address.slice(0, cityIndex) : address;
};

const trimPart = (value: string | undefined): string => value?.trim() ?? '';

const checkStreet = (properties: PhotonProperties): boolean => properties.type === 'street';

const getStreet = (properties: PhotonProperties): string => {
  return trimPart(checkStreet(properties) ? properties.name : properties.street);
};

const getId = (properties: PhotonProperties, address: string): string => {
  return properties.osm_id ? `${properties.osm_type ?? ''}${properties.osm_id}` : address;
};

/** Город и регион, если он не совпадает с городом */
const getDetails = (properties: PhotonProperties, city: string): string => {
  const state = trimPart(properties.state);
  return joinParts([city, state !== city ? state : undefined]);
};

const toSuggestion = (feature: PhotonFeature): AddressSuggestion | null => {
  const properties = feature.properties ?? {};
  const isStreet = checkStreet(properties);
  const street = getStreet(properties);
  const houseNumber = isStreet ? '' : trimPart(properties.housenumber);
  const city = getCity(properties);
  const location = getLocation(feature.geometry?.coordinates);
  // Без улицы, населённого пункта или координат не предлагаем; без дома — только саму улицу
  if (!street || !city || !location || (!isStreet && !houseNumber)) {
    return null;
  }
  const address = buildFullAddress(properties, city);
  if (address.length > DELIVERY_ADDRESS_MAX) {
    return null;
  }
  return {
    id: getId(properties, address),
    address,
    city,
    location,
    street,
    houseNumber,
    isStreet,
    shortAddress: joinParts([street, houseNumber]),
    details: getDetails(properties, city),
  };
};

/**
 * Ответ Photon /api (GeoJSON FeatureCollection) → варианты без дублей.
 * Дубль — тот же дом в том же городе: у заведений в доме бывает свой индекс или его нет вовсе.
 * Длинная улица в OSM разбита на куски — они тоже схлопываются в один вариант.
 */
export const mapPhotonResults = (raw: unknown): AddressSuggestion[] => {
  const features: unknown = (raw as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) {
    return [];
  }
  const suggestions = new Map<string, AddressSuggestion>();
  for (const feature of features as PhotonFeature[]) {
    const suggestion = toSuggestion(feature);
    if (!suggestion) {
      continue;
    }
    const key = `${suggestion.shortAddress}|${suggestion.city}`.toLowerCase();
    if (!suggestions.has(key)) {
      suggestions.set(key, suggestion);
    }
  }
  return [...suggestions.values()];
};
