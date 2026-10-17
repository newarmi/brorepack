<template>
  <RouterLink class="order-item card" :to="props.to">
    <span class="order-item__thumb">
      <PlaquePreview :design="props.order.design" decorative />
    </span>
    <span class="order-item__body">
      <span class="order-item__head">
        <span class="order-item__number">№{{ props.order.number }}</span>
        <StatusPill :status="props.order.status" />
      </span>
      <span class="order-item__title">{{ title }}</span>
      <span class="order-item__details">{{ details }}</span>
      <span class="order-item__foot">
        <span class="order-item__date">{{ formatDay(props.order.createdAt) }}</span>
        <span class="order-item__total">{{ formatPrice(props.order.price.total) }}</span>
      </span>
    </span>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';

import type { Order } from '@brorepack/shared';
import { formatPrice } from '@brorepack/shared';

import { formatPlaqueTitle, PlaquePreview } from '@/entities/plaque';
import { formatDay } from '@/shared/lib';

import StatusPill from './StatusPill.vue';

const props = defineProps<{ order: Order; to: RouteLocationRaw; meta?: string }>();

const title = computed(() => formatPlaqueTitle(props.order.design));
const details = computed(() =>
  [props.meta, props.order.design.displayName, props.order.design.size].filter(Boolean).join(' · '),
);
</script>

<style scoped>
.order-item {
  display: flex;
  gap: 14px;
  padding: 14px 16px;
  color: inherit;
  transition: border-color var(--transition-fast);
}

.order-item:hover {
  border-color: var(--color-accent);
  box-shadow: var(--glow-accent);
}

.order-item__thumb {
  flex-shrink: 0;
  width: 64px;
}

.order-item__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.order-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.order-item__number {
  font-size: var(--text-md);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.order-item__title {
  margin-top: 6px;
  font-size: 15px;
  font-weight: 700;
}

.order-item__details {
  overflow: hidden;
  color: var(--color-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-item__foot {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 13px;
}

.order-item__date {
  color: var(--color-faint);
}

.order-item__total {
  font-weight: 700;
}
</style>
