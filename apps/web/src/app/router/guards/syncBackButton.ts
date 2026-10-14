import type { NavigationHookAfter } from 'vue-router';

import { useBackButtonStore } from '@/shared/telegram';

/** Кнопка «Назад» видна везде, кроме экранов с meta.isBackHidden */
export const syncBackButton: NavigationHookAfter = (to) => {
  useBackButtonStore().setVisibleOnRoute(!to.meta.isBackHidden);
};
