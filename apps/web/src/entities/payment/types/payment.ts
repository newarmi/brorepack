import type { Order } from '@brorepack/shared';

import type { PAYMENT_STATUS } from '../constants/paymentStatus';

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/** При успешной оплате вместе со статусом приходит обновлённый заказ */
export type PaymentOutcome =
  | { status: typeof PAYMENT_STATUS.paid; order: Order }
  | { status: Exclude<PaymentStatus, typeof PAYMENT_STATUS.paid> };
