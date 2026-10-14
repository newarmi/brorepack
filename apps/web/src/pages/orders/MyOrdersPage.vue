<template>
  <div class="my-orders-page">
    <h1 class="page-title my-orders-page__title">Мои заказы</h1>

    <AsyncState
      :status="status"
      errorTitle="Не получилось загрузить заказы"
      :errorText="error?.message"
      :isEmpty="orders.length === 0"
      emptyTitle="Заказов пока нет"
      emptyText="Собери первую плашку — это пара минут: ник, дизайн и оплата в Telegram."
      @retry="load"
    >
      <template #loading>
        <div class="my-orders-page__list" aria-busy="true" aria-label="Загружаем заказы">
          <SkeletonBlock v-for="index in 3" :key="index" height="112px" radius="20px" />
        </div>
      </template>

      <template #emptyActions>
        <AppButton variant="primary" block @click="startNewOrderHandler">Собрать плашку</AppButton>
      </template>

      <ul class="my-orders-page__list">
        <li v-for="order in orders" :key="order.id">
          <OrderListItem
            :order="order"
            :to="{ name: ROUTE_NAMES.order, params: { id: order.id } }"
          />
        </li>
      </ul>
    </AsyncState>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { fetchMyOrders, OrderListItem } from '@/entities/order';
import { ROUTE_NAMES } from '@/shared/config';
import { useAsyncData } from '@/shared/lib';
import { AppButton, AsyncState, SkeletonBlock } from '@/shared/ui';

const router = useRouter();
const { data, status, error, load } = useAsyncData(fetchMyOrders);

const orders = computed(() => data.value ?? []);

const startNewOrderHandler = (): void => {
  void router.push({ name: ROUTE_NAMES.start });
};
</script>

<style scoped>
.my-orders-page__title {
  margin-bottom: 16px;
}

.my-orders-page__list {
  display: grid;
  gap: 10px;
}
</style>
