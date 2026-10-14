import type { CreateOrderInput, CreateOrderResponse, Order, PaymentMode } from '@brorepack/shared';

import { call } from '@/shared/api';

/** Ответ POST /api/orders/:id/invoice (в shared отдельного типа нет) */
export interface InvoiceResponse {
  invoiceUrl: string | null;
  paymentMode: PaymentMode;
}

export const createOrder = (input: CreateOrderInput): Promise<CreateOrderResponse> => {
  return call<CreateOrderResponse>({
    rest: { path: '/orders', method: 'POST', body: input },
    gas: { action: 'orders.create', params: input },
  });
};

export const fetchMyOrders = (signal?: AbortSignal): Promise<Order[]> => {
  return call<Order[]>(
    {
      rest: { path: '/orders' },
      gas: { action: 'orders.list' },
    },
    signal,
  );
};

export const fetchOrder = (id: number, signal?: AbortSignal): Promise<Order> => {
  return call<Order>(
    {
      rest: { path: `/orders/${id}` },
      gas: { action: 'orders.get', params: { id } },
    },
    signal,
  );
};

export const createOrderInvoice = (id: number): Promise<InvoiceResponse> => {
  return call<InvoiceResponse>({
    rest: { path: `/orders/${id}/invoice`, method: 'POST' },
    gas: { action: 'orders.invoice', params: { id } },
  });
};

/** Только при PAYMENTS_MODE=mock на сервере */
export const mockPayOrder = (id: number): Promise<Order> => {
  return call<Order>({
    rest: { path: `/orders/${id}/mock-pay`, method: 'POST' },
    gas: { action: 'orders.mockPay', params: { id } },
  });
};
