<template>
  <div class="admin-orders-page">
    <h1 class="page-title">Заказы</h1>
    <StatusFilter v-model="filter" class="admin-orders-page__filter" />

    <AsyncState
      :status
      errorTitle="Не получилось загрузить заказы"
      :errorText="error?.message"
      :isEmpty="orders.length === 0"
      emptyTitle="Здесь пока пусто"
      :emptyText
      @retry="load"
    >
      <template #loading>
        <div class="admin-orders-page__list" aria-busy="true" aria-label="Загружаем заказы">
          <SkeletonBlock v-for="index in 4" :key="index" height="112px" radius="20px" />
        </div>
      </template>

      <ul class="admin-orders-page__list">
        <li v-for="order in orders" :key="order.id">
          <OrderListItem
            :order
            :meta="getCustomerLabel(order)"
            :to="{ name: ROUTE_NAMES.adminOrder, params: { id: order.id } }"
          />
        </li>
      </ul>
    </AsyncState>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { Order } from '@brorepack/shared';

import { OrderListItem } from '@/entities/order';
import { StatusFilter, useAdminOrders } from '@/features/admin';
import { ROUTE_NAMES } from '@/shared/config';
import { AsyncState, SkeletonBlock } from '@/shared/ui';

const { filter, orders, status, error, load, isActiveFilter } = useAdminOrders();

const emptyText = computed(() =>
  isActiveFilter.value
    ? 'Текущих заказов нет. Новые оплаченные заказы появятся здесь сами — список обновляется каждые 30 секунд.'
    : 'Заказы с этим статусом появятся автоматически — список обновляется каждые 30 секунд.',
);

const getCustomerLabel = (order: Order): string => {
  return order.customer.username ? `@${order.customer.username}` : order.customer.firstName;
};
</script>

<style scoped>
.admin-orders-page__filter {
  margin: 14px 0 16px;
}

.admin-orders-page__list {
  display: grid;
  gap: 10px;
}
</style>
