import { STREET_TYPE_NAMES } from '../constants/addressWords';
import type { AddressSuggestion } from '../types/address';
import type { ParsedQuery } from './addressQuery';
import { parseSearchQuery } from './addressQuery';

const MIN_TYPO_WORD_LENGTH = 4;

/**
 * Очки за совпадения. Названный в запросе город важнее всего: адрес в другом городе бесполезен.
 * Дальше улица целиком с типом и дом
 */
const SCORE = {
  placeWord: 8,
  exactStreet: 6,
  streetType: 4,
  exactHouse: 6,
  houseNumber: 3,
  streetWord: 2,
};

/** Для сравнения: ё = е, слова через дефис — отдельные слова */
const splitWords = (text: string): string[] => {
  return text
    .toLowerCase()
    .replaceAll('ё', 'е')
    .split(/[^\p{L}\d/]+/u)
    .filter(Boolean);
};

/** Расстояние Левенштейна: сколько букв вставить, удалить или заменить, чтобы из одного слова получить другое */
const getEditDistance = (first: string, second: string): number => {
  let previousRow = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    const currentRow = [row];
    for (let column = 1; column <= second.length; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;
      currentRow[column] = Math.min(
        (previousRow[column] ?? 0) + 1,
        (currentRow[column - 1] ?? 0) + 1,
        (previousRow[column - 1] ?? 0) + cost,
      );
    }
    previousRow = currentRow;
  }
  return previousRow[second.length] ?? 0;
};

/**
 * Слово запроса — начало слова адреса, возможно с одной опечаткой («тверкая» → «тверская»).
 * Опечатку прощаем только в словах от 4 букв: в коротких она даёт слишком много совпадений.
 */
const checkWordMatch = (queryWord: string, word: string): boolean => {
  if (word.startsWith(queryWord)) {
    return true;
  }
  if (queryWord.length < MIN_TYPO_WORD_LENGTH) {
    return false;
  }
  return [-1, 0, 1].some(
    (extra) => getEditDistance(queryWord, word.slice(0, queryWord.length + extra)) <= 1,
  );
};

const checkAnyWordMatch = (queryWord: string, words: string[]): boolean => {
  return words.some((word) => checkWordMatch(queryWord, word));
};

const normalizeHouse = (houseNumber: string): string => {
  return houseNumber.toLowerCase().replaceAll('ё', 'е').replace(/\s+/g, '');
};

/** Дом совпал целиком или только номер, без литеры и корпуса («7» и «7 к1») */
const getHouseScore = (queryHouse: string, houseNumber: string): number => {
  const house = normalizeHouse(houseNumber);
  if (!queryHouse || !house) {
    return 0;
  }
  if (house === queryHouse) {
    return SCORE.exactHouse;
  }
  return parseInt(house, 10) === parseInt(queryHouse, 10) ? SCORE.houseNumber : 0;
};

interface ScoredSuggestion {
  suggestion: AddressSuggestion;
  streetMatches: number;
  score: number;
}

const scoreSuggestion = (
  suggestion: AddressSuggestion,
  query: ParsedQuery,
  queryWords: string[],
): ScoredSuggestion => {
  const allStreetWords = splitWords(suggestion.street);
  const streetWords = allStreetWords.filter((word) => !STREET_TYPE_NAMES.has(word));
  // Слово, узнанное в улице, городу не засчитываем: «тверская» — улица, а не «Тверская область»
  const otherWords = queryWords.filter((queryWord) => !checkAnyWordMatch(queryWord, streetWords));
  const streetMatches = queryWords.length - otherWords.length;
  // Улица названа целиком: «тверская» → «Тверская улица», но не «1-я Тверская-Ямская улица»
  const isStreetExact =
    streetWords.length > 0 &&
    streetWords.every((word) => queryWords.some((queryWord) => checkWordMatch(queryWord, word)));
  const placeWords = splitWords(suggestion.details);
  const placeMatches = otherWords.filter((queryWord) => checkAnyWordMatch(queryWord, placeWords));
  const score =
    placeMatches.length * SCORE.placeWord +
    (isStreetExact ? SCORE.exactStreet : 0) +
    (query.streetType && allStreetWords.includes(query.streetType) ? SCORE.streetType : 0) +
    getHouseScore(query.house, suggestion.houseNumber) +
    streetMatches * SCORE.streetWord;
  return { suggestion, streetMatches, score };
};

/**
 * Подсказки по близости к запросу (searchQuery — результат toSearchQuery).
 * Отбрасываем варианты, где улица не похожа ни на одно слово запроса: Photon ищет и по названиям
 * заведений и на «тверская» отдаёт прокуратуру на Петровке. Опечатки он прощает — мы тоже (одну).
 * Сортировка устойчивая — при равных очках остаётся порядок Photon (он учитывает известность места).
 */
export const rankSuggestions = (
  suggestions: AddressSuggestion[],
  searchQuery: string,
): AddressSuggestion[] => {
  const query = parseSearchQuery(searchQuery);
  const queryWords = splitWords(query.words.join(' '));
  return (
    suggestions
      .map((suggestion) => scoreSuggestion(suggestion, query, queryWords))
      .filter(({ streetMatches }) => streetMatches > 0 || !queryWords.length)
      // Дом уже назван — улица без дома подсказкой не нужна
      .filter(({ suggestion }) => !query.house || !suggestion.isStreet)
      .sort((first, second) => second.score - first.score)
      .map(({ suggestion }) => suggestion)
  );
};
