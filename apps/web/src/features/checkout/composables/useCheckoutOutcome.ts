import type { Order } from '@brorepack/shared';
import { useRouter } from 'vue-router';

import { useDraftStore } from '@/entities/draft';
import type { PaymentOutcome, PaymentStatus } from '@/entities/payment';
import { notifyPaymentOutcome } from '@/entities/payment';
import { JUST_PAID_QUERY, ROUTE_NAMES } from '@/shared/config';
import { useToast } from '@/shared/ui';

/** Что делать после оплаты на экране оформления — по одному обработчику на каждый исход */
export const useCheckoutOutcome = () => {
  const router = useRouter();
  const draft = useDraftStore();
  const { showToast } = useToast();

  const openOrder = (order: Order): void => {
    void router.push({ name: ROUTE_NAMES.order, params: { id: order.id } });
  };

  // pending или оплата недоступна вне Telegram — статус покажет экран заказа
  const outcomeHandlers: Record<PaymentStatus, (order: Order) => void> = {
    paid: (order) => {
      draft.reset();
      void router.replace({
        name: ROUTE_NAMES.order,
        params: { id: order.id },
        query: JUST_PAID_QUERY,
      });
    },
    cancelled: () => showToast('Оплата отменена — заказ сохранён, можно оплатить позже'),
    failed: () => {},
    pending: openOrder,
    unavailable: openOrder,
  };

  return (outcome: PaymentOutcome, order: Order): void => {
    notifyPaymentOutcome(outcome);
    outcomeHandlers[outcome.status](outcome.status === 'paid' ? outcome.order : order);
  };
};

export default useCheckoutOutcome;
