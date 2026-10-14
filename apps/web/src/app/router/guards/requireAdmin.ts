import type { NavigationGuard } from 'vue-router';

import { useSessionStore } from '@/entities/session';
import { ROUTE_NAMES } from '@/shared/config';
import { useToast } from '@/shared/ui';

/** Админка только для ADMIN_IDS: ждём /api/me, остальных возвращаем на старт */
export const requireAdmin: NavigationGuard = async (to) => {
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
