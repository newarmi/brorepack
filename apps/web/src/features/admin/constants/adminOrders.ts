import type { OrderStatus } from '@brorepack/shared';
import { ORDER_STATUS_LABELS } from '@brorepack/shared';

import { ORDER_STATUS } from '@/entities/order';

export const ADMIN_POLL_INTERVAL_MS = 30_000;

/** active — заказы в работе: оплачен, в печати, отправлен */
export type StatusFilterValue = OrderStatus | 'all' | 'active';

export const STATUS_FILTER = {
  active: 'active',
  all: 'all',
} as const satisfies Record<string, StatusFilterValue>;

/** «Текущие» — заказы, с которыми владельцу ещё работать */
export const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  ORDER_STATUS.paid,
  ORDER_STATUS.printing,
  ORDER_STATUS.shipped,
];

// Порядок чипов: сначала то, с чем работают чаще
const FILTER_STATUSES: OrderStatus[] = [
  ORDER_STATUS.paid,
  ORDER_STATUS.printing,
  ORDER_STATUS.shipped,
  ORDER_STATUS.delivered,
  ORDER_STATUS.cancelled,
  ORDER_STATUS.awaitingPayment,
];

export const STATUS_FILTER_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: STATUS_FILTER.active, label: 'Текущие' },
  { value: STATUS_FILTER.all, label: 'Все' },
  ...FILTER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS_LABELS[status] })),
];
