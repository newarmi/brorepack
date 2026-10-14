import type { RouteRecordRaw } from 'vue-router';

import { ROUTE_NAMES } from '@/shared/config';

/** Админка: пускает только владельцев (guards/requireAdmin) */
export const adminRoutes: RouteRecordRaw[] = [
  {
    path: '/admin',
    name: ROUTE_NAMES.admin,
    component: () => import('@/pages/admin/AdminOrdersPage.vue'),
    meta: { requiresAdmin: true, back: () => ({ name: ROUTE_NAMES.start }) },
  },
  {
    path: '/admin/orders/:id(\\d+)',
    name: ROUTE_NAMES.adminOrder,
    component: () => import('@/pages/admin/AdminOrderPage.vue'),
    meta: { requiresAdmin: true, back: () => ({ name: ROUTE_NAMES.admin }) },
  },
];
