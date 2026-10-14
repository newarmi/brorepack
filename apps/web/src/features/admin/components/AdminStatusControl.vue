<template>
  <section class="status-control card">
    <fieldset>
      <legend class="card-title">Статус</legend>
      <div class="status-control__grid">
        <label
          v-for="option in options"
          :key="option.value"
          class="status-control__option"
          :class="{ 'status-control__option--active': option.value === status }"
        >
          <input
            v-model="status"
            class="visually-hidden"
            type="radio"
            :name="name"
            :value="option.value"
          />
          {{ option.label }}
        </label>
      </div>
    </fieldset>

    <TextField
      v-if="isShipped"
      v-model="trackingNumber"
      class="status-control__tracking"
      label="Трек-номер СДЭК"
      autocapitalize="off"
      placeholder="Например, 1234567890"
      :maxlength="64"
      hint="Клиент получит его в сообщении от бота"
    />
  </section>
</template>

<script setup lang="ts">
import type { OrderStatus } from '@brorepack/shared';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@brorepack/shared';
import { computed, useId } from 'vue';

import { ORDER_STATUS } from '@/entities/order';
import { TextField } from '@/shared/ui';

const status = defineModel<OrderStatus>('status', { required: true });
const trackingNumber = defineModel<string>('trackingNumber', { required: true });

const options = ORDER_STATUSES.map((value) => ({ value, label: ORDER_STATUS_LABELS[value] }));
const name = `admin-status-${useId()}`;

const isShipped = computed(() => status.value === ORDER_STATUS.shipped);
</script>

<style scoped>
.status-control {
  padding: 16px 20px;
}

.status-control__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.status-control__option {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 6px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: var(--color-bg);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
}

.status-control__option--active {
  border-color: var(--color-accent);
  background: var(--color-surface-2);
  color: var(--color-text);
}

.status-control__option:has(:focus-visible) {
  outline: 2px solid var(--color-accent-hi);
  outline-offset: 2px;
}

.status-control__tracking {
  margin-top: 16px;
}
</style>
