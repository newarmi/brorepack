<template>
  <DetailsList title="Дизайн" :items="getDesignDetails(props.order)" />

  <DetailsList title="Клиент" :items="getCustomerDetails(props.order)">
    <AppButton
      v-if="props.order.customer.username"
      class="admin-order-details__chat"
      variant="link"
      @click="openCustomerChatHandler"
    >
      Написать @{{ props.order.customer.username }}
    </AppButton>
  </DetailsList>

  <DetailsList title="Получатель" :items="getRecipientDetails(props.order)">
    <a class="admin-order-details__phone" :href="phoneHref">Позвонить</a>
  </DetailsList>

  <DetailsList title="Доставка" :items="getDeliveryDetails(props.order)" />
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { Order } from '@brorepack/shared';

import { useTelegram } from '@/shared/telegram';
import { AppButton } from '@/shared/ui';

import {
  getCustomerDetails,
  getDeliveryDetails,
  getDesignDetails,
  getRecipientDetails,
} from '../utils/orderDetails';
import DetailsList from './DetailsList.vue';

const props = defineProps<{ order: Order }>();

const telegram = useTelegram();

const phoneHref = computed(() => `tel:${props.order.recipient.phone.replace(/[^\d+]/g, '')}`);

const openCustomerChatHandler = (): void => {
  const username = props.order.customer.username;
  if (username) {
    telegram.openTelegramLink(`https://t.me/${username}`);
  }
};
</script>

<style scoped>
.admin-order-details__chat {
  margin: 8px 0 -8px -8px;
}

.admin-order-details__phone {
  display: inline-block;
  margin-top: 12px;
  font-size: 14px;
  font-weight: 600;
}
</style>
