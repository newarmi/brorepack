import type { Router } from 'vue-router';

import { openDeepLink } from './openDeepLink';
import { requireAdmin } from './requireAdmin';
import { requireProfile } from './requireProfile';
import { syncBackButton } from './syncBackButton';

/**
 * Проверки перед каждым переходом — по порядку:
 * ссылка из бота → нужен профиль FACEIT → нужны права админа.
 * После перехода — видимость кнопки «Назад».
 */
export const installGuards = (router: Router): void => {
  router.beforeEach(openDeepLink);
  router.beforeEach(requireProfile);
  router.beforeEach(requireAdmin);
  router.afterEach(syncBackButton);
};
