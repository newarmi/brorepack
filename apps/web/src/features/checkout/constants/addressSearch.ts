/** Пауза после последнего символа: геокодер не дёргаем на каждую букву */
export const ADDRESS_SEARCH_DEBOUNCE_MS = 400;
export const ADDRESS_SEARCH_MIN_LENGTH = 3;
/**
 * Сколько вариантов просить у Photon. Больше, чем показываем: часть ответа — объекты без дома
 * (станции, памятники) и заведения в одном доме, их отбрасываем, а оставшиеся ранжируем сами
 */
export const ADDRESS_SEARCH_REQUEST_LIMIT = 20;
/** Сколько подсказок показываем */
export const ADDRESS_SUGGESTIONS_LIMIT = 5;
/** Доставка только по России */
export const ADDRESS_SEARCH_COUNTRY_CODE = 'RU';
// Photon знает только default/de/en/fr; default — местные названия, для России это русский
export const ADDRESS_SEARCH_LANGUAGE = 'default';
/**
 * Дома и улицы. Без номера дома Photon в слое house улицу не находит («полковника романова» — пусто),
 * поэтому улицу подсказываем отдельно: её выбор подставляет улицу в поле и ждёт номер дома
 */
export const ADDRESS_SEARCH_LAYERS = ['house', 'street'];
/** Атрибуция данных OpenStreetMap обязательна по лицензии ODbL */
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
