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
