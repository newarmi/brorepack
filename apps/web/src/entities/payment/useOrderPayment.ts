import type { Order } from '@brorepack/shared';
import { shallowRef } from 'vue';

import type { InvoiceResponse } from '@/entities/order/api';
import { useTelegram } from '@/shared/telegram/useTelegram';
import { useToast } from '@/shared/ui/useToast';

import type { PaymentOutcome } from './types';
import { useMockPayment } from './useMockPayment';
import { waitForPaidOrder } from './waitForPaidOrder';

/**
 * Оплата заказа: Telegram Payments (openInvoice) или тестовая шторка
 * при PAYMENTS_MODE=mock. Вне Telegram openInvoice не вызывается.
 */
export const useOrderPayment = () => {
  const telegram = useTelegram();
  const { showToast } = useToast();
  const mockPayment = useMockPayment();

  const isConfirming = shallowRef(false);

  const payInTelegram = async (order: Order, invoiceUrl: string): Promise<PaymentOutcome> => {
    const status = await telegram.openInvoice(invoiceUrl);
    if (status !== 'paid') {
      return { status };
    }
    isConfirming.value = true;
    try {
      const paidOrder = await waitForPaidOrder(order.id);
      return { status: 'paid', order: paidOrder ?? order };
    } finally {
      isConfirming.value = false;
    }
  };

  const pay = async (order: Order, invoice: InvoiceResponse): Promise<PaymentOutcome> => {
    if (invoice.paymentMode === 'mock') {
      return mockPayment.openMockSheet(order);
    }
    if (!invoice.invoiceUrl) {
      showToast('Не получилось выставить счёт. Попробуй ещё раз', 'error');
      return { status: 'failed' };
    }
    if (!telegram.isTelegram) {
      showToast('Оплата через Telegram работает только внутри Telegram', 'error');
      return { status: 'unavailable' };
    }
    return payInTelegram(order, invoice.invoiceUrl);
  };

  return {
    pay,
    isConfirming,
    mockOrder: mockPayment.mockOrder,
    isMockSheetOpen: mockPayment.isMockSheetOpen,
    isMockPaying: mockPayment.isMockPaying,
    confirmMockPayment: mockPayment.confirmMockPayment,
  };
};

export default useOrderPayment;
