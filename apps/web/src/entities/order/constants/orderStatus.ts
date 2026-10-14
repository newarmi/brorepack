import type { OrderStatus } from '@brorepack/shared';

export const ORDER_STATUS = {
  awaitingPayment: 'awaiting_payment',
  paid: 'paid',
  printing: 'printing',
  shipped: 'shipped',
  delivered: 'delivered',
  cancelled: 'cancelled',
} as const satisfies Record<string, OrderStatus>;
