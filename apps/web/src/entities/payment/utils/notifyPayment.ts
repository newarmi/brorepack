import { useTelegram } from '@/shared/telegram';
import { useToast } from '@/shared/ui';

import type { PaymentOutcome } from '../types/payment';

// Одинаковая реакция на оплату на любом экране: вибрация и тост об ошибке.
// Что делать дальше (перейти, обновить заказ) — решает экран

export const notifyPaymentOutcome = (outcome: PaymentOutcome): void => {
  const { haptic } = useTelegram();
  const { showToast } = useToast();
  if (outcome.status === 'paid') {
    haptic.notify('success');
    return;
  }
  if (outcome.status === 'failed') {
    haptic.notify('error');
    showToast('Оплата не прошла. Попробуй ещё раз', 'error');
  }
};

export const notifyPaymentError = (error: unknown): void => {
  useTelegram().haptic.notify('error');
  useToast().showErrorToast(error);
};
