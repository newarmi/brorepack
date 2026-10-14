import { START_LOCATION } from 'vue-router';
import type { NavigationGuard } from 'vue-router';

import { ROUTE_NAMES } from '@/shared/config';
import { useTelegram } from '@/shared/telegram';

import { resolveStartParam } from '../navigation/resolveStartParam';

/** Первое открытие по ссылке из бота сразу ведёт на нужный экран */
export const openDeepLink: NavigationGuard = (to, from) => {
  if (from !== START_LOCATION || to.name !== ROUTE_NAMES.start) {
    return true;
  }
  return resolveStartParam(useTelegram().startParam) ?? true;
};
