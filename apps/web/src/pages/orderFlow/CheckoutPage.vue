<template>
  <div ref="root" class="checkout-page">
    <OrderSummaryCard :design="draft.design" :amount="draft.plaquePrice.total" />

    <DeliveryFields
      v-model:method="draft.delivery.method"
      v-model:city="draft.delivery.city"
      v-model:address="draft.delivery.address"
      :cityError="validation.errorFor('delivery.city')"
      :addressError="validation.errorFor('delivery.address')"
      @blur="validation.touch(`delivery.${$event}`)"
    />

    <RecipientFields
      v-model:name="draft.recipient.name"
      v-model:phone="draft.recipient.phone"
      :nameError="validation.errorFor('recipient.name')"
      :phoneError="validation.errorFor('recipient.phone')"
      :isPhoneRequesting="isPhoneRequesting"
      @blur="validation.touch(`recipient.${$event}`)"
      @requestPhone="requestPhone"
    />

    <PriceTotals :lines="draft.orderPrice.lines" :total="draft.orderPrice.total" />

    <p class="checkout-page__caption">Оплата через Telegram · ЮKassa</p>

    <MockPaySheet
      v-model:open="isMockSheetOpen"
      :order="mockOrder"
      :loading="isMockPaying"
      @confirm="confirmMockPayment"
    />
  </div>
</template>

<script setup lang="ts">
import { formatPrice } from '@brorepack/shared';
import { useTemplateRef } from 'vue';

import { useDraftStore } from '@/entities/draft';
import { OrderSummaryCard, PriceTotals } from '@/entities/order';
import { MockPaySheet } from '@/entities/payment';
import {
  DeliveryFields,
  RecipientFields,
  useCheckout,
  usePhoneFromTelegram,
} from '@/features/checkout';
import { useBackButton, useMainButton } from '@/shared/telegram';

const draft = useDraftStore();
const root = useTemplateRef<HTMLElement>('root');
const { validation, payment, isBusy, submit } = useCheckout(root);
const { mockOrder, isMockSheetOpen, isMockPaying, confirmMockPayment } = payment;

const { isPhoneRequesting, requestPhone } = usePhoneFromTelegram((phone) => {
  draft.recipient.phone = phone;
  validation.touch('recipient.phone');
});

useMainButton({
  text: () => `Оплатить ${formatPrice(draft.orderPrice.total)}`,
  visible: () => !isMockSheetOpen.value,
  loading: isBusy,
  onClick: () => void submit(),
});

useBackButton(() => {
  isMockSheetOpen.value = false;
}, isMockSheetOpen);
</script>

<style scoped>
.checkout-page {
  display: grid;
  gap: 20px;
}

.checkout-page__caption {
  color: var(--color-muted);
  font-size: 12px;
  text-align: center;
}
</style>
