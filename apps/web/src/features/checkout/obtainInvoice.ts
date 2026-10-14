import type { CreateOrderInput, Order } from '@brorepack/shared';

import { useDraftStore } from '@/entities/draft/store';
import type { InvoiceResponse } from '@/entities/order/api';
import { createOrder, createOrderInvoice, fetchOrder } from '@/entities/order/api';
import { ORDER_STATUS } from '@/entities/order/constants';

interface OrderWithInvoice {
  order: Order;
  invoice: InvoiceResponse;
}

/** Счёт для заказа, созданного раньше из этого же черновика; null — заказ устарел или недоступен */
const reusePendingOrder = async (pendingId: number): Promise<OrderWithInvoice | null> => {
  try {
    const order = await fetchOrder(pendingId);
    if (order.status !== ORDER_STATUS.awaitingPayment) {
      return null;
    }
    return { order, invoice: await createOrderInvoice(pendingId) };
  } catch {
    // Заказ устарел или недоступен — создадим новый
    return null;
  }
};

/** Неоплаченный заказ из этого же черновика переиспользуем, чтобы не плодить дубли */
export const obtainInvoice = async (input: CreateOrderInput): Promise<OrderWithInvoice> => {
  const draft = useDraftStore();
  const pendingId = draft.pendingOrderId;
  const pending = pendingId === null ? null : await reusePendingOrder(pendingId);
  if (pending) {
    return pending;
  }

  const response = await createOrder(input);
  draft.rememberPendingOrder(response.order.id);
  return {
    order: response.order,
    invoice: { invoiceUrl: response.invoiceUrl, paymentMode: response.paymentMode },
  };
};
