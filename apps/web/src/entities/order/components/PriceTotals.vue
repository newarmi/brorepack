<template>
  <section class="price-totals card" aria-label="Стоимость">
    <dl class="price-totals__lines">
      <div v-for="line in props.lines" :key="line.code" class="price-totals__row">
        <dt>{{ line.label }}</dt>
        <dd>{{ formatPrice(line.amount) }}</dd>
      </div>
    </dl>
    <div class="price-totals__total">
      <span>Итого</span>
      <strong>{{ formatPrice(props.total) }}</strong>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PriceLine } from '@brorepack/shared';
import { formatPrice } from '@brorepack/shared';

const props = defineProps<{ lines: PriceLine[]; total: number }>();
</script>

<style scoped>
.price-totals {
  padding: 16px 20px;
}

.price-totals__lines {
  display: grid;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-line);
}

.price-totals__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-muted);
  font-size: 14px;
}

.price-totals__row dd {
  margin: 0;
  color: var(--color-text);
  font-weight: 400;
  white-space: nowrap;
}

.price-totals__total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-top: 14px;
  font-size: 16px;
  font-weight: 700;
}

.price-totals__total strong {
  color: var(--color-accent);
  font-size: var(--text-2xl);
  font-weight: 700;
  white-space: nowrap;
}
</style>
