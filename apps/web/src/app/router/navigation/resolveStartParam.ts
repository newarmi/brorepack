import type { RouteLocationRaw } from 'vue-router';

import { ROUTE_NAMES } from '@/shared/config';

/** start_param из ссылки t.me/<bot>?startapp=… : `order_<id>` или `admin` */
export const resolveStartParam = (startParam: string | null): RouteLocationRaw | null => {
  if (!startParam) {
    return null;
  }
  const orderMatch = /^order_(\d+)$/.exec(startParam);
  if (orderMatch) {
    return { name: ROUTE_NAMES.order, params: { id: orderMatch[1] } };
  }
  return startParam === 'admin' ? { name: ROUTE_NAMES.admin } : null;
};
