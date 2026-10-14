import type { RouteRecordRaw } from 'vue-router';

import { useDraftStore } from '@/entities/draft';
import { ROUTE_NAMES } from '@/shared/config';

// Конструктор открывается из профиля; если профиля нет (открыли по ссылке) — со старта
const getConstructorBack = () => {
  const draft = useDraftStore();
  return draft.profile
    ? { name: ROUTE_NAMES.profile, params: { nickname: draft.profile.nickname } }
    : { name: ROUTE_NAMES.start };
};

/** Путь клиента к заказу: дизайн → ник → профиль FACEIT → конструктор → оформление */
export const orderFlowRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: ROUTE_NAMES.start,
    component: () => import('@/pages/orderFlow/StartPage.vue'),
    meta: { isBackHidden: true },
  },
  {
    path: '/nickname',
    name: ROUTE_NAMES.nickname,
    component: () => import('@/pages/orderFlow/NicknamePage.vue'),
    meta: { back: () => ({ name: ROUTE_NAMES.start }) },
  },
  {
    path: '/profile/:nickname',
    name: ROUTE_NAMES.profile,
    component: () => import('@/pages/orderFlow/ProfilePage.vue'),
    meta: { back: () => ({ name: ROUTE_NAMES.nickname }) },
  },
  {
    path: '/constructor',
    name: ROUTE_NAMES.constructor,
    component: () => import('@/pages/orderFlow/ConstructorPage.vue'),
    meta: { requiresProfile: true, back: getConstructorBack },
  },
  {
    path: '/checkout',
    name: ROUTE_NAMES.checkout,
    component: () => import('@/pages/orderFlow/CheckoutPage.vue'),
    meta: { requiresProfile: true, back: () => ({ name: ROUTE_NAMES.constructor }) },
  },
];
