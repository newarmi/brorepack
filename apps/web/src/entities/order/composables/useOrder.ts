import type { MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';

import { useAsyncData, usePolling } from '@/shared/lib';

import { fetchOrder } from '../api/orders';

/** Заказ по id: первая загрузка со скелетоном, дальше — тихое обновление раз в `pollIntervalMs` */
export const useOrder = (id: MaybeRefOrGetter<number>, pollIntervalMs?: number) => {
  const {
    data: order,
    status,
    error,
    load: reload,
    refresh,
    setData: setOrder,
  } = useAsyncData((signal) => fetchOrder(toValue(id), signal), [() => toValue(id)]);

  if (pollIntervalMs) {
    usePolling(refresh, pollIntervalMs);
  }

  return { order, status, error, reload, setOrder };
};

export default useOrder;
