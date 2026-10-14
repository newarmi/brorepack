import type { Order } from '@brorepack/shared';
import type { Ref } from 'vue';
import { shallowRef } from 'vue';

import { useDraftStore } from '@/entities/draft';
import { createOrderInvoice } from '@/entities/order';
import { notifyPaymentError, notifyPaymentOutcome, useOrderPayment } from '@/entities/payment';

/** Оплата уже созданного заказа с его экрана (например, отложенного на оформлении) */
export const usePayOrder = (order: Ref<Order | null>, onPaid: (paidOrder: Order) => void) => {
  const draft = useDraftStore();
  const payment = useOrderPayment();

  const isPaying = shallowRef(false);

  const payNow = async (): Promise<void> => {
    const current = order.value;
    if (!current || isPaying.value) {
      return;
    }
    isPaying.value = true;
    try {
      const outcome = await payment.pay(current, await createOrderInvoice(current.id));
      notifyPaymentOutcome(outcome);
      if (outcome.status !== 'paid') {
        return;
      }
      onPaid(outcome.order);
      // Оплатили заказ, отложенный на оформлении, — черновик больше не нужен
      if (draft.pendingOrder?.id === outcome.order.id) {
        draft.reset();
      }
    } catch (error) {
      notifyPaymentError(error);
    } finally {
      isPaying.value = false;
    }
  };

  return { payment, isPaying, payNow };
};

export default usePayOrder;
