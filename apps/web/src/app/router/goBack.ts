import type { Router } from 'vue-router';

import { ROUTE_NAMES } from '@/shared/config/routes';

/** «Назад»: по истории приложения, а если её нет (открыли по ссылке) — на родительский экран */
export const goBack = (router: Router): void => {
  const route = router.currentRoute.value;
  const historyState = window.history.state as { back?: string | null } | null;
  if (historyState?.back) {
    router.back();
    return;
  }
  void router.replace(route.meta.back?.(route) ?? { name: ROUTE_NAMES.start });
};
