import type { ApiError } from '@/shared/api';
import { API_ERROR_CODES } from '@/shared/api';

const NOT_FOUND_CODES: string[] = [API_ERROR_CODES.playerNotFound, API_ERROR_CODES.invalidNickname];

const ERROR_TITLES: Record<string, string> = {
  [API_ERROR_CODES.playerNotFound]: 'Не нашли такого игрока на FACEIT',
  [API_ERROR_CODES.invalidNickname]: 'Не нашли такого игрока на FACEIT',
  [API_ERROR_CODES.faceitUnavailable]: 'FACEIT сейчас не отвечает',
  [API_ERROR_CODES.faceitNotConfigured]: 'FACEIT не подключён',
};

const DEFAULT_ERROR_TITLE = 'Не получилось загрузить профиль';

/** Игрока нет — повторять бессмысленно, нужно поменять ник */
export const checkPlayerNotFound = (error: ApiError | null): boolean => {
  return error !== null && NOT_FOUND_CODES.includes(error.code);
};

export const getProfileErrorTitle = (error: ApiError | null): string => {
  return (error ? ERROR_TITLES[error.code] : undefined) ?? DEFAULT_ERROR_TITLE;
};

export const getProfileErrorText = (error: ApiError | null, nickname: string) => {
  if (checkPlayerNotFound(error)) {
    return `Проверь ник «${nickname}» — регистр и символы важны. Профиль должен быть открытым.`;
  }
  return error?.message;
};
