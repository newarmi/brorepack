import type { RouteRecordRaw } from 'vue-router';

import { ROUTE_NAMES } from '@/shared/config';

/** Заказы клиента: список и карточка заказа (сюда же ведёт ссылка из бота `order_<id>`) */
export const ordersRoutes: RouteRecordRaw[] = [
  {
    path: '/orders',
    name: ROUTE_NAMES.orders,
    component: () => import('@/pages/orders/MyOrdersPage.vue'),
    meta: { back: () => ({ name: ROUTE_NAMES.start }) },
  },
  {
    path: '/orders/:id(\\d+)',
    name: ROUTE_NAMES.order,
    component: () => import('@/pages/orders/OrderPage.vue'),
    meta: { back: () => ({ name: ROUTE_NAMES.orders }) },
  },
];
