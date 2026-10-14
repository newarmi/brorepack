import type { RouteRecordRaw } from 'vue-router';

import { ROUTE_NAMES } from '@/shared/config';

import { adminRoutes } from './admin';
import { orderFlowRoutes } from './orderFlow';
import { ordersRoutes } from './orders';

// Все маршруты приложения по разделам. Неизвестный адрес ведёт на старт
export const routes: RouteRecordRaw[] = [
  ...orderFlowRoutes,
  ...ordersRoutes,
  ...adminRoutes,
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: ROUTE_NAMES.start },
  },
];
