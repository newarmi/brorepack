<template>
  <header v-if="props.isJustPaid" class="order-header order-header--success">
    <span class="order-header__check" aria-hidden="true">
      <AppIcon name="check" :size="30" />
    </span>
    <h1 class="page-title order-header__title">Заказ №{{ props.order.number }} оплачен</h1>
    <p class="order-header__subtitle">Статусы пришлём в этот чат</p>
  </header>

  <header v-else class="order-header">
    <div class="order-header__row">
      <h1 class="page-title order-header__title">Заказ №{{ props.order.number }}</h1>
      <StatusPill :status="props.order.status" />
    </div>
    <p class="order-header__subtitle">от {{ formatDateTime(props.order.createdAt) }}</p>
  </header>
</template>

<script setup lang="ts">
import type { Order } from '@brorepack/shared';

import StatusPill from '@/entities/order/StatusPill.vue';
import { formatDateTime } from '@/shared/lib/format';
import AppIcon from '@/shared/ui/AppIcon.vue';

const props = defineProps<{ order: Order; isJustPaid: boolean }>();
</script>

<style scoped>
.order-header--success {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 4px;
  text-align: center;
}

.order-header__check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  border-radius: 50%;
  background: var(--color-ok-soft);
  color: var(--color-ok);
}

.order-header__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.order-header__title {
  line-height: 1.25;
}

.order-header__subtitle {
  margin-top: 6px;
  color: var(--color-muted);
  font-size: 14px;
}
</style>
