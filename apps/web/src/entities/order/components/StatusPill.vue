<template>
  <span class="status-pill" :class="`status-pill--${props.status}`">{{ label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { OrderStatus } from '@brorepack/shared';
import { ORDER_STATUS_LABELS } from '@brorepack/shared';

const props = defineProps<{ status: OrderStatus }>();

const label = computed(() => ORDER_STATUS_LABELS[props.status]);
</script>

<style scoped>
/* У каждого статуса свой вид: «Оплачен» нейтральный, работа над заказом — оранжевым, «Отправлен» — сплошным */
.status-pill {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-chip);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.status-pill--paid {
  border-color: var(--color-line-strong);
  color: var(--color-text);
}

.status-pill--printing {
  color: var(--color-accent-hi);
  background: var(--color-accent-soft);
}

.status-pill--shipped {
  color: var(--color-on-accent);
  background: var(--color-accent);
}

.status-pill--awaiting_payment {
  color: var(--color-warn);
  background: var(--color-warn-soft);
}

.status-pill--delivered {
  color: var(--color-ok);
  background: var(--color-ok-soft);
}

.status-pill--cancelled {
  color: var(--color-danger);
  background: var(--color-danger-soft);
}
</style>
