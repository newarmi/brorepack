<template>
  <BottomSheet v-model:open="open" title="Тестовая оплата" :dismissible="!props.loading">
    <p class="mock-pay__text">
      Платежи работают в тестовом режиме — деньги не спишутся. Заказ №{{ props.order?.number }}
      сразу станет оплаченным.
    </p>
    <p class="mock-pay__amount">{{ amount }}</p>
    <div class="mock-pay__actions">
      <AppButton variant="primary" block :loading="props.loading" @click="emits('confirm')">
        Оплатить (тест)
      </AppButton>
      <AppButton variant="link" block :disabled="props.loading" @click="open = false"
        >Отмена</AppButton
      >
    </div>
  </BottomSheet>
</template>

<script setup lang="ts">
import type { Order } from '@brorepack/shared';
import { formatPrice } from '@brorepack/shared';
import { computed } from 'vue';

import AppButton from '@/shared/ui/AppButton.vue';
import BottomSheet from '@/shared/ui/BottomSheet.vue';

const emits = defineEmits<{ confirm: [] }>();

const open = defineModel<boolean>('open', { required: true });

const props = defineProps<{ order: Order | null; loading: boolean }>();

const amount = computed(() => (props.order ? formatPrice(props.order.price.total) : ''));
</script>

<style scoped>
.mock-pay__text {
  color: var(--color-muted);
  font-size: 14px;
}

.mock-pay__amount {
  margin: 18px 0;
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  text-align: center;
}

.mock-pay__actions {
  display: grid;
  gap: 6px;
}
</style>
