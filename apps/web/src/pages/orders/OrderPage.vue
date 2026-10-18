<template>
  <div class="order-page">
    <AsyncState
      :status
      :errorTitle="isOrderMissing ? 'Заказ не найден' : 'Не получилось загрузить заказ'"
      :errorText="error?.message"
    >
      <template #loading>
        <div class="order-page__skeleton" aria-busy="true" aria-label="Загружаем заказ">
          <SkeletonBlock width="70%" height="28px" />
          <SkeletonBlock height="78px" radius="20px" />
          <SkeletonBlock height="240px" radius="20px" />
        </div>
      </template>

      <template #errorActions>
        <AppButton variant="primary" icon="refresh" block @click="reload">Повторить</AppButton>
        <AppButton variant="link" block @click="openOrdersHandler">Мои заказы</AppButton>
      </template>

      <div v-if="order" class="order-page__content appear">
        <OrderHeader :order :isJustPaid />

        <OrderSummaryCard :design="order.design" :amount="order.price.total" />

        <CancelledNotice v-if="isCancelled" />
        <OrderTimeline v-else :order />

        <AppButton v-if="isShareVisible" icon="share" block @click="shareOrder(order)">
          Поделиться превью
        </AppButton>
      </div>
    </AsyncState>

    <MockPaySheet
      v-model:open="isMockSheetOpen"
      :order="mockOrder"
      :loading="isMockPaying"
      @confirm="confirmMockPayment"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { Order } from '@brorepack/shared';
import { formatPrice } from '@brorepack/shared';

import { ORDER_STATUS, OrderSummaryCard, useOrder } from '@/entities/order';
import { MockPaySheet } from '@/entities/payment';
import {
  CancelledNotice,
  OrderHeader,
  OrderTimeline,
  shareOrder,
  usePayOrder,
} from '@/features/orders';
import { JUST_PAID_QUERY, ROUTE_NAMES } from '@/shared/config';
import { useBackButton, useMainButton, useTelegram } from '@/shared/telegram';
import { AppButton, AsyncState, SkeletonBlock } from '@/shared/ui';

const ORDER_POLL_INTERVAL_MS = 15_000;

const route = useRoute();
const router = useRouter();
const telegram = useTelegram();

const orderId = computed(() => Number(route.params.id));
const { order, status, error, reload, setOrder } = useOrder(orderId, ORDER_POLL_INTERVAL_MS);

const isPaidInThisSession = shallowRef(route.query.paid === JUST_PAID_QUERY.paid);

const { payment, isPaying, payNow } = usePayOrder(order, (paidOrder: Order) => {
  setOrder(paidOrder);
  isPaidInThisSession.value = true;
});
const { mockOrder, isMockSheetOpen, isMockPaying, isConfirming, confirmMockPayment } = payment;

const isOrderMissing = computed(() => error.value?.status === 404 || error.value?.status === 403);
const isAwaitingPayment = computed(() => order.value?.status === ORDER_STATUS.awaitingPayment);
const isCancelled = computed(() => order.value?.status === ORDER_STATUS.cancelled);
const isJustPaid = computed(
  () => isPaidInThisSession.value && !isAwaitingPayment.value && !isCancelled.value,
);
const isShareVisible = computed(() => !isAwaitingPayment.value && !isCancelled.value);

const mainButtonText = computed(() => {
  if (isAwaitingPayment.value && order.value) {
    return `Оплатить ${formatPrice(order.value.price.total)}`;
  }
  return 'Вернуться в чат';
});

const openOrdersHandler = (): void => {
  void router.push({ name: ROUTE_NAMES.orders });
};

const returnToChatHandler = (): void => {
  if (!telegram.close()) {
    void router.push({ name: ROUTE_NAMES.start });
  }
};

const mainButtonHandler = (): void => {
  if (isAwaitingPayment.value) {
    void payNow();
    return;
  }
  returnToChatHandler();
};

useMainButton({
  text: mainButtonText,
  visible: () => status.value === 'ready' && !isMockSheetOpen.value,
  loading: () => isPaying.value || isConfirming.value,
  onClick: mainButtonHandler,
});

// После оплаты «Назад» не должен возвращать в оформление — ведём на старт
useBackButton(
  () => void router.replace({ name: ROUTE_NAMES.start }),
  () => route.query.paid === JUST_PAID_QUERY.paid,
);
useBackButton(() => {
  isMockSheetOpen.value = false;
}, isMockSheetOpen);
</script>

<style scoped>
.order-page,
.order-page__skeleton,
.order-page__content {
  display: grid;
  gap: 16px;
}
</style>
