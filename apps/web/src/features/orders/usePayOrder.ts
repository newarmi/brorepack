import type { Order } from '@brorepack/shared';
import type { Ref } from 'vue';
import { shallowRef } from 'vue';

import { useDraftStore } from '@/entities/draft/store';
import { createOrderInvoice } from '@/entities/order/api';
import { notifyPaymentError, notifyPaymentOutcome } from '@/entities/payment/notifyPayment';
import { useOrderPayment } from '@/entities/payment/useOrderPayment';

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
