import type { Order } from '@brorepack/shared';
import { computed, onBeforeUnmount, shallowRef } from 'vue';

import { mockPayOrder } from '@/entities/order/api';
import { useToast } from '@/shared/ui/useToast';

import type { PaymentOutcome } from './types';

/**
 * Тестовая оплата при PAYMENTS_MODE=mock: шторка «Оплатить (тест)».
 * `openMockSheet` возвращает промис, который разрешится, когда шторку подтвердят или закроют.
 */
export const useMockPayment = () => {
  const { showErrorToast } = useToast();

  const mockOrder = shallowRef<Order | null>(null);
  const isMockPaying = shallowRef(false);
  let resolveMock: ((outcome: PaymentOutcome) => void) | null = null;

  const finishMock = (outcome: PaymentOutcome): void => {
    const resolve = resolveMock;
    resolveMock = null;
    mockOrder.value = null;
    resolve?.(outcome);
  };

  const isMockSheetOpen = computed({
    get: () => mockOrder.value !== null,
    set: (isOpen: boolean) => {
      if (!isOpen && !isMockPaying.value) {
        finishMock({ status: 'cancelled' });
      }
    },
  });

  const openMockSheet = (order: Order): Promise<PaymentOutcome> => {
    finishMock({ status: 'cancelled' });
    mockOrder.value = order;
    return new Promise((resolve) => {
      resolveMock = resolve;
    });
  };

  const confirmMockPayment = async (): Promise<void> => {
    const order = mockOrder.value;
    if (!order || isMockPaying.value) {
      return;
    }
    isMockPaying.value = true;
    try {
      const paidOrder = await mockPayOrder(order.id);
      finishMock({ status: 'paid', order: paidOrder });
    } catch (error) {
      showErrorToast(error);
    } finally {
      isMockPaying.value = false;
    }
  };

  onBeforeUnmount(() => finishMock({ status: 'cancelled' }));

  return { mockOrder, isMockSheetOpen, isMockPaying, openMockSheet, confirmMockPayment };
};

export default useMockPayment;
