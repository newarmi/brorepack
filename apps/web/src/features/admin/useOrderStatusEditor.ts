import type { Order, OrderStatus } from '@brorepack/shared';
import type { MaybeRefOrGetter } from 'vue';
import { computed, shallowRef, toValue, watch } from 'vue';

import { ORDER_STATUS } from '@/entities/order/constants';
import { useTelegram } from '@/shared/telegram/useTelegram';
import { useToast } from '@/shared/ui/useToast';

import { updateAdminOrder } from './api';

/** Изменился ли статус или, для отправленного заказа, трек-номер */
const checkStatusChanged = (order: Order, status: OrderStatus, tracking: string): boolean => {
  if (status !== order.status) {
    return true;
  }
  return status === ORDER_STATUS.shipped && tracking.trim() !== (order.trackingNumber ?? '');
};

/** Смена статуса и трек-номера заказа в админке. Трек-номер имеет смысл только у отправленного */
export const useOrderStatusEditor = (
  order: MaybeRefOrGetter<Order | null>,
  onUpdated: (order: Order) => void,
) => {
  const telegram = useTelegram();
  const { showToast, showErrorToast } = useToast();

  const statusDraft = shallowRef<OrderStatus>(ORDER_STATUS.paid);
  const trackingDraft = shallowRef('');
  const isSaving = shallowRef(false);

  const isShippedDraft = computed(() => statusDraft.value === ORDER_STATUS.shipped);

  const isDirty = computed(() => {
    const current = toValue(order);
    return current !== null && checkStatusChanged(current, statusDraft.value, trackingDraft.value);
  });

  const resetDrafts = (value: Order | null): void => {
    if (!value) {
      return;
    }
    statusDraft.value = value.status;
    trackingDraft.value = value.trackingNumber ?? '';
  };

  watch(() => toValue(order), resetDrafts, { immediate: true });

  const save = async (): Promise<void> => {
    const current = toValue(order);
    if (!current || !isDirty.value || isSaving.value) {
      return;
    }
    isSaving.value = true;
    try {
      const tracking = trackingDraft.value.trim();
      const updated = await updateAdminOrder(current.id, {
        status: statusDraft.value,
        trackingNumber: isShippedDraft.value ? tracking || null : undefined,
      });
      onUpdated(updated);
      telegram.haptic.notify('success');
      showToast('Статус сохранён — клиент получит сообщение', 'success');
    } catch (error) {
      telegram.haptic.notify('error');
      showErrorToast(error);
    } finally {
      isSaving.value = false;
    }
  };

  return { statusDraft, trackingDraft, isDirty, isSaving, save };
};

export default useOrderStatusEditor;
