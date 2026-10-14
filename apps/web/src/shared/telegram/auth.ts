import { DEV_USER_ID } from '@/shared/config/env';

import { initData, isTelegram } from './webApp';

/** initData из Telegram или `dev:<id>` вне Telegram (сервер принимает его только в режиме разработки) */
export const getAuthPayload = (): string => {
  return isTelegram ? initData : `dev:${DEV_USER_ID}`;
};
