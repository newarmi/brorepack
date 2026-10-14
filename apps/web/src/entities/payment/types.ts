import type { Order } from '@brorepack/shared';

export type PaymentOutcome =
  { status: 'paid'; order: Order } | { status: 'cancelled' | 'failed' | 'pending' | 'unavailable' };

export type PaymentStatus = PaymentOutcome['status'];
