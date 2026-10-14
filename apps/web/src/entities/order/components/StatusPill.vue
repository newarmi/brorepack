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
.status-pill {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: var(--radius-chip);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--color-accent-hi);
  background: var(--color-accent-soft);
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
