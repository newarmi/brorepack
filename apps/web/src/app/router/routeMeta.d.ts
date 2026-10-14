import 'vue-router';

import type { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** Экран требует найденный профиль FACEIT в черновике */
    requiresProfile?: boolean;
    requiresAdmin?: boolean;
    /** Кнопки «Назад» на экране нет (стартовый экран) */
    isBackHidden?: boolean;
    /** Куда вести «Назад», если в истории приложения нет предыдущего экрана */
    back?: (route: RouteLocationNormalizedLoaded) => RouteLocationRaw;
  }
}
