<template>
  <header v-if="props.isJustPaid" class="order-header order-header--success">
    <div class="order-header__plaque">
      <PlaquePreview :design="props.order.design" glow decorative />
      <span class="order-header__check" aria-hidden="true">
        <AppIcon name="check" :size="22" />
      </span>
    </div>
    <p class="order-header__eyebrow">Оплачено</p>
    <h1 class="page-title order-header__title">Заказ №{{ props.order.number }} оплачен</h1>
    <p class="order-header__subtitle">Начинаем работу. Статусы пришлём в этот чат</p>
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

import { StatusPill } from '@/entities/order';
import { PlaquePreview } from '@/entities/plaque';
import { formatDateTime } from '@/shared/lib';
import { AppIcon } from '@/shared/ui';

const props = defineProps<{ order: Order; isJustPaid: boolean }>();
</script>

<style scoped>
/* Экран после оплаты: заказанная плашка крупно, со свечением её шаблона */
.order-header--success {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0 4px;
  text-align: center;
}

.order-header__plaque {
  position: relative;
  width: min(46%, 180px);
  margin-bottom: 24px;
}

.order-header__check {
  position: absolute;
  right: -14px;
  bottom: -14px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 3px solid var(--color-bg);
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--color-on-accent);
  box-shadow: var(--glow-accent);
}

.order-header__eyebrow {
  margin-bottom: 6px;
  color: var(--color-accent);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.order-header__eyebrow::before {
  content: '// ';
}

.order-header__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.order-header__subtitle {
  margin-top: 6px;
  color: var(--color-muted);
  font-size: var(--text-sm);
}
</style>
