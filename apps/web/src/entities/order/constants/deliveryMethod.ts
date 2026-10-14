import type { DeliveryMethod } from '@brorepack/shared';

export const DELIVERY_METHOD = {
  /** Пункт выдачи СДЭК */
  cdekPickupPoint: 'cdek_pvz',
  courier: 'courier',
} as const satisfies Record<string, DeliveryMethod>;
