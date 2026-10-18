/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Telegram id пользователя для `tma dev:<id>` вне Telegram (по умолчанию 1) */
  readonly VITE_DEV_USER_ID?: string;
  /** Ссылка на бота для «Поделиться превью», например https://t.me/brorepack_bot */
  readonly VITE_BOT_URL?: string;
  /** Бэкенд: rest — apps/server (по умолчанию), gas — Google Apps Script */
  readonly VITE_API_TRANSPORT?: 'rest' | 'gas';
  /** Адрес веб-приложения Apps Script (…/exec), нужен при VITE_API_TRANSPORT=gas */
  readonly VITE_GAS_URL?: string;
  /** Базовый URL геокодера Photon для подсказок адреса, например https://photon.komoot.io; пусто — ручной ввод */
  readonly VITE_GEOCODER_URL?: string;
}

/** Номер сборки фронта, подставляет vite.config.ts (define) */
declare const __BUILD_ID__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
