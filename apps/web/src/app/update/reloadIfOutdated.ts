import { BUILD_ID, IS_PRODUCTION_BUILD } from '@/shared/config';

// Telegram на iPhone долго держит index.html в кэше WebView: после деплоя открывается старая версия.
// Приложение при старте спрашивает номер свежей сборки и, если он другой, открывает себя по новому адресу

const VERSION_URL = './version.json';
// Номер сборки, ради которой уже перезагружались: если и после неё пришла старая страница — не зацикливаемся
const RELOADED_BUILD_KEY = 'brorepack:reloaded-build';

const fetchLatestBuildId = async (): Promise<string | null> => {
  try {
    // ?t= и no-store — чтобы сам version.json не взялся из кэша
    const response = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    const data: unknown = await response.json();
    const buildId = (data as { buildId?: unknown } | null)?.buildId;
    return typeof buildId === 'string' ? buildId : null;
  } catch {
    return null;
  }
};

const readReloadedBuild = (): string | null => {
  try {
    return sessionStorage.getItem(RELOADED_BUILD_KEY);
  } catch {
    return null;
  }
};

const writeReloadedBuild = (buildId: string): void => {
  try {
    sessionStorage.setItem(RELOADED_BUILD_KEY, buildId);
  } catch {
    // Без sessionStorage просто не защитимся от повтора — перезагрузка всё равно одна на запуск
  }
};

/**
 * Тот же адрес с номером сборки в query: для WebView это новая страница, и index.html берётся из сети.
 * Hash сохраняется — в нём маршрут и данные запуска Telegram
 */
const buildFreshUrl = (buildId: string): string => {
  const url = new URL(window.location.href);
  url.searchParams.set('v', buildId);
  return url.toString();
};

/** Перезагружает приложение, если на сервере уже другая сборка. Вне собранного приложения ничего не делает */
export const reloadIfOutdated = async (): Promise<void> => {
  if (!IS_PRODUCTION_BUILD) {
    return;
  }
  const latestBuildId = await fetchLatestBuildId();
  if (!latestBuildId || latestBuildId === BUILD_ID || readReloadedBuild() === latestBuildId) {
    return;
  }
  writeReloadedBuild(latestBuildId);
  window.location.replace(buildFreshUrl(latestBuildId));
};
