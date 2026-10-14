<template>
  <article class="order-summary card">
    <div class="order-summary__thumb">
      <PlaquePreview :design="props.design" decorative />
    </div>
    <div class="order-summary__body">
      <h2 class="order-summary__title">{{ title }}</h2>
      <p class="order-summary__meta">{{ summary }}</p>
    </div>
    <p class="order-summary__price">{{ formatPrice(props.amount) }}</p>
  </article>
</template>

<script setup lang="ts">
import type { PlaqueDesign } from '@brorepack/shared';
import { formatPrice } from '@brorepack/shared';
import { computed } from 'vue';

import { formatDesignSummary, formatPlaqueTitle, PlaquePreview } from '@/entities/plaque';

const props = defineProps<{ design: PlaqueDesign; amount: number }>();

const title = computed(() => formatPlaqueTitle(props.design));
const summary = computed(() => formatDesignSummary(props.design));
</script>

<style scoped>
.order-summary {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}

.order-summary__thumb {
  flex-shrink: 0;
  width: 48px;
}

.order-summary__body {
  flex: 1;
  min-width: 0;
}

.order-summary__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}

.order-summary__meta {
  margin-top: 2px;
  overflow: hidden;
  color: var(--color-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-summary__price {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
