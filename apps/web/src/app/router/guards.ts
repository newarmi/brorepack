import type { NavigationGuard, Router } from 'vue-router';
import { START_LOCATION } from 'vue-router';

import { useDraftStore } from '@/entities/draft/store';
import { useSessionStore } from '@/entities/session/store';
import { ROUTE_NAMES } from '@/shared/config/routes';
import { useBackButtonStore } from '@/shared/telegram/backButtonStore';
import { useTelegram } from '@/shared/telegram/useTelegram';
import { useToast } from '@/shared/ui/useToast';

import { resolveStartParam } from './deepLink';

/** Первое открытие по ссылке из бота сразу ведёт на нужный экран */
const openDeepLink: NavigationGuard = (to, from) => {
  if (from !== START_LOCATION || to.name !== ROUTE_NAMES.start) {
    return true;
  }
  return resolveStartParam(useTelegram().startParam) ?? true;
};

const requireProfile: NavigationGuard = (to) => {
  if (to.meta.requiresProfile && !useDraftStore().hasProfile) {
    return { name: ROUTE_NAMES.start };
  }
  return true;
};

const requireAdmin: NavigationGuard = async (to) => {
  if (!to.meta.requiresAdmin) {
    return true;
  }
  const session = useSessionStore();
  await session.load();
  if (session.isAdmin) {
    return true;
  }
  useToast().showToast('Админка доступна только владельцу', 'error');
  return { name: ROUTE_NAMES.start };
};

export const installGuards = (router: Router): void => {
  router.beforeEach(openDeepLink);
  router.beforeEach(requireProfile);
  router.beforeEach(requireAdmin);
  router.afterEach((to) => {
    useBackButtonStore().setVisibleOnRoute(!to.meta.isBackHidden);
  });
};
