import type { NavigationGuard } from 'vue-router';

import { useDraftStore } from '@/entities/draft';
import { ROUTE_NAMES } from '@/shared/config';

/** Конструктор и оформление без найденного профиля FACEIT не открываются */
export const requireProfile: NavigationGuard = (to) => {
  if (to.meta.requiresProfile && !useDraftStore().hasProfile) {
    return { name: ROUTE_NAMES.start };
  }
  return true;
};
