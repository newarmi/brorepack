import {
  APARTMENT_WORDS,
  BUILDING_PREFIXES,
  FILLER_WORDS,
  STREET_TYPE_NAMES,
  STREET_TYPES,
} from '../constants/addressWords';

const HOUSE_PATTERN = /^\d+[а-яё]?(\/\d+[а-яё]?)?$/;
const BUILDING_PATTERN = /^[кс]\d+$/;
// «7к1» → «7 к1»
const GLUED_BUILDING_PATTERN = /^(\d+[а-яё]?)([кс]\d+)$/;

/** Слова запроса: регистр, пунктуация и лишние пробелы не важны; дефис и дробь внутри слова остаются */
const splitTokens = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\d/-]+/gu, ' ')
    .split(' ')
    .map((token) => token.replace(/^[/-]+|[/-]+$/g, ''))
    .filter(Boolean)
    .flatMap((token) => GLUED_BUILDING_PATTERN.exec(token)?.slice(1) ?? [token]);
};

/**
 * Запрос в едином виде: «Москва, ул. Тверская, д. 7, корп. 1, кв. 12» → «москва улица тверская 7 к1».
 * Одинаковые по смыслу запросы дают одну строку — их не ищем и не ранжируем повторно.
 * Букву ё не трогаем: Photon находит «королёва 5», но не «королева 5».
 */
export const toSearchQuery = (text: string): string => {
  const tokens = splitTokens(text);
  const apartmentIndex = tokens.findIndex((token) => APARTMENT_WORDS.has(token));
  const addressTokens = apartmentIndex === -1 ? tokens : tokens.slice(0, apartmentIndex);
  const words: string[] = [];
  for (let index = 0; index < addressTokens.length; index += 1) {
    const token = addressTokens[index] ?? '';
    const nextToken = addressTokens[index + 1] ?? '';
    const buildingPrefix = BUILDING_PREFIXES[token];
    if (buildingPrefix && /^\d+$/.test(nextToken)) {
      words.push(`${buildingPrefix}${nextToken}`);
      index += 1;
      continue;
    }
    if (!FILLER_WORDS.has(token)) {
      words.push(STREET_TYPES[token] ?? token);
    }
  }
  return words.join(' ');
};

/**
 * Строка для Photon — без типа улицы: он ищет такие слова и в названиях заведений,
 * а ошибка в типе («улица» вместо «проспект») рушит выдачу. Тип учитываем только при ранжировании.
 */
export const toGeocoderQuery = (searchQuery: string): string => {
  return searchQuery
    .split(' ')
    .filter((word) => !STREET_TYPE_NAMES.has(word))
    .join(' ');
};

export interface ParsedQuery {
  /** «7к1»; пустая строка — дом не указан */
  house: string;
  /** «проспект»; пустая строка — тип не указан */
  streetType: string;
  /** Остальное: улица и населённый пункт */
  words: string[];
}

/** Номер дома — последнее число запроса вместе с корпусом или строением после него */
export const parseSearchQuery = (searchQuery: string): ParsedQuery => {
  const tokens = searchQuery.split(' ').filter(Boolean);
  const streetType = tokens.find((token) => STREET_TYPE_NAMES.has(token)) ?? '';
  const otherTokens = tokens.filter((token) => !STREET_TYPE_NAMES.has(token));
  const houseIndex = otherTokens.map((token) => HOUSE_PATTERN.test(token)).lastIndexOf(true);
  if (houseIndex === -1) {
    return { house: '', streetType, words: otherTokens };
  }
  let houseEnd = houseIndex + 1;
  while (BUILDING_PATTERN.test(otherTokens[houseEnd] ?? '')) {
    houseEnd += 1;
  }
  return {
    house: otherTokens.slice(houseIndex, houseEnd).join(''),
    streetType,
    words: [...otherTokens.slice(0, houseIndex), ...otherTokens.slice(houseEnd)],
  };
};
