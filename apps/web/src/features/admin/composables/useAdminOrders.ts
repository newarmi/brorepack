import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { Order } from '@brorepack/shared';
import { ORDER_STATUSES } from '@brorepack/shared';

import { isOneOf, useAsyncData, usePolling } from '@/shared/lib';

import { fetchAdminOrders } from '../api/admin';
import type { StatusFilterValue } from '../constants/adminOrders';
import {
  ACTIVE_ORDER_STATUSES,
  ADMIN_POLL_INTERVAL_MS,
  STATUS_FILTER,
} from '../constants/adminOrders';

/** Фильтр по статусу живёт в query, чтобы «Назад» из карточки заказа возвращал к тому же списку */
const useStatusFilter = () => {
  const route = useRoute();
  const router = useRouter();

  return computed<StatusFilterValue>({
    get: () => {
      const value = route.query.status;
      if (value === STATUS_FILTER.all) {
        return STATUS_FILTER.all;
      }
      return isOneOf(ORDER_STATUSES, value) ? value : STATUS_FILTER.active;
    },
    set: (value) => {
      void router.replace({ query: value === STATUS_FILTER.active ? {} : { status: value } });
    },
  });
};

const loadOrdersByFilter = async (filter: StatusFilterValue, signal: AbortSignal) => {
  if (filter === STATUS_FILTER.all) {
    return fetchAdminOrders(undefined, signal);
  }
  if (filter !== STATUS_FILTER.active) {
    return fetchAdminOrders(filter, signal);
  }
  const orders = await fetchAdminOrders(undefined, signal);
  return orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
};

/** Список заказов в админке: по умолчанию «Текущие», обновляется сам раз в 30 секунд */
export const useAdminOrders = () => {
  const filter = useStatusFilter();
  const { data, status, error, load, refresh } = useAsyncData(
    (signal) => loadOrdersByFilter(filter.value, signal),
    [filter],
  );

  usePolling(refresh, ADMIN_POLL_INTERVAL_MS);

  const orders = computed<Order[]>(() => data.value ?? []);
  const isActiveFilter = computed(() => filter.value === STATUS_FILTER.active);

  return { filter, orders, status, error, load, isActiveFilter };
};

export default useAdminOrders;
