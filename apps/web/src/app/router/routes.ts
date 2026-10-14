import type { RouteRecordRaw } from 'vue-router';

import { useDraftStore } from '@/entities/draft/store';
import { ROUTE_NAMES } from '@/shared/config/routes';

// Конструктор открывается из профиля; если профиля нет (открыли по ссылке) — со старта
const getConstructorBack = () => {
  const draft = useDraftStore();
  return draft.profile
    ? { name: ROUTE_NAMES.profile, params: { nickname: draft.profile.nickname } }
    : { name: ROUTE_NAMES.start };
};

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: ROUTE_NAMES.start,
    component: () => import('@/pages/StartPage.vue'),
    meta: { isBackHidden: true },
  },
  {
    path: '/nickname',
    name: ROUTE_NAMES.nickname,
    component: () => import('@/pages/NicknamePage.vue'),
    meta: { back: () => ({ name: ROUTE_NAMES.start }) },
  },
  {
    path: '/profile/:nickname',
    name: ROUTE_NAMES.profile,
    component: () => import('@/pages/ProfilePage.vue'),
    meta: { back: () => ({ name: ROUTE_NAMES.nickname }) },
  },
  {
    path: '/constructor',
    name: ROUTE_NAMES.constructor,
    component: () => import('@/pages/ConstructorPage.vue'),
    meta: { requiresProfile: true, back: getConstructorBack },
  },
  {
    path: '/checkout',
    name: ROUTE_NAMES.checkout,
    component: () => import('@/pages/CheckoutPage.vue'),
    meta: { requiresProfile: true, back: () => ({ name: ROUTE_NAMES.constructor }) },
  },
  {
    path: '/orders',
    name: ROUTE_NAMES.orders,
    component: () => import('@/pages/MyOrdersPage.vue'),
    meta: { back: () => ({ name: ROUTE_NAMES.start }) },
  },
  {
    path: '/orders/:id(\\d+)',
    name: ROUTE_NAMES.order,
    component: () => import('@/pages/OrderPage.vue'),
    meta: { back: () => ({ name: ROUTE_NAMES.orders }) },
  },
  {
    path: '/admin',
    name: ROUTE_NAMES.admin,
    component: () => import('@/pages/AdminOrdersPage.vue'),
    meta: { requiresAdmin: true, back: () => ({ name: ROUTE_NAMES.start }) },
  },
  {
    path: '/admin/orders/:id(\\d+)',
    name: ROUTE_NAMES.adminOrder,
    component: () => import('@/pages/AdminOrderPage.vue'),
    meta: { requiresAdmin: true, back: () => ({ name: ROUTE_NAMES.admin }) },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: ROUTE_NAMES.start },
  },
];
