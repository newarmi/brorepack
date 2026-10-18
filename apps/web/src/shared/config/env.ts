// Единственное место, где читаются переменные окружения. Описание каждой — в env.d.ts

/**
 * Какой бэкенд использует фронт:
 * - rest — apps/server (Node), запросы на /api/*
 * - gas — apps/gas (Google Apps Script), запросы на VITE_GAS_URL по протоколу docs/gas.md
 */
export type ApiTransportName = 'rest' | 'gas';

export const API_TRANSPORT: ApiTransportName =
  import.meta.env.VITE_API_TRANSPORT === 'gas' ? 'gas' : 'rest';

export const IS_GAS_TRANSPORT = API_TRANSPORT === 'gas';

export const GAS_URL = import.meta.env.VITE_GAS_URL ?? '';

export const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID ?? '1';

/** Без VITE_BOT_URL «Поделиться превью» ведёт на адрес самого приложения */
export const BOT_URL = import.meta.env.VITE_BOT_URL || window.location.origin;

/**
 * Геокодер Photon для подсказок адреса: публичный https://photon.komoot.io или свой экземпляр.
 * Nominatim сюда нельзя: у него другой API, а публичный сервер запрещает автоподсказки.
 * Пусто — подсказок нет, адрес вводится вручную.
 */
export const GEOCODER_URL = (import.meta.env.VITE_GEOCODER_URL ?? '').replace(/\/+$/, '');

export const IS_ADDRESS_SEARCH_ENABLED = GEOCODER_URL !== '';

/** Номер сборки — по нему приложение узнаёт, что Telegram открыл устаревшую копию из кэша */
export const BUILD_ID = __BUILD_ID__;

/** Проверка свежей сборки нужна только собранному приложению: в dev version.json нет */
export const IS_PRODUCTION_BUILD = import.meta.env.PROD;
