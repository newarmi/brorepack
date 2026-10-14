import type { ShallowRef } from 'vue';
import { computed, shallowRef } from 'vue';

import { useDraftStore } from '@/entities/draft/store';
import { notifyPaymentError } from '@/entities/payment/notifyPayment';
import { useOrderPayment } from '@/entities/payment/useOrderPayment';
import { useTelegram } from '@/shared/telegram/useTelegram';
import { useToast } from '@/shared/ui/useToast';

import { focusFirstInvalidField } from './focusFirstInvalidField';
import { obtainInvoice } from './obtainInvoice';
import { useCheckoutOutcome } from './useCheckoutOutcome';
import { useCheckoutValidation } from './useCheckoutValidation';

/** Оформление: проверить форму → получить счёт → оплатить → перейти к заказу */
export const useCheckout = (root: Readonly<ShallowRef<HTMLElement | null>>) => {
  const telegram = useTelegram();
  const draft = useDraftStore();
  const { showToast } = useToast();
  const payment = useOrderPayment();
  const handleOutcome = useCheckoutOutcome();
  const validation = useCheckoutValidation(() => draft.orderInput);

  const isSubmitting = shallowRef(false);
  const isBusy = computed(() => isSubmitting.value || payment.isConfirming.value);

  const showFirstInvalidField = async (): Promise<void> => {
    telegram.haptic.notify('error');
    const isFocused = await focusFirstInvalidField(root.value);
    if (!isFocused) {
      showToast(validation.firstIssueMessage() ?? 'Проверь заказ', 'error');
    }
  };

  const submit = async (): Promise<void> => {
    if (isBusy.value) {
      return;
    }
    validation.isSubmitAttempted.value = true;
    const result = validation.result.value;
    if (!result.success) {
      await showFirstInvalidField();
      return;
    }

    isSubmitting.value = true;
    try {
      const { order, invoice } = await obtainInvoice(result.data);
      handleOutcome(await payment.pay(order, invoice), order);
    } catch (error) {
      notifyPaymentError(error);
    } finally {
      isSubmitting.value = false;
    }
  };

  return { validation, payment, isBusy, submit };
};

export default useCheckout;
