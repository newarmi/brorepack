<template>
  <section class="delivery-fields">
    <SegmentedControl v-model="method" :options="methodOptions" label="Доставка" />
    <!-- Одно поле адреса на оба способа доставки: при переключении вкладки меняется только подсказка под ним.
         Подсказки геокодера или явный ручной ввод -->
    <AddressField
      v-model="address"
      v-model:manual="isManualAddress"
      label="Адрес"
      placeholder="Город, улица, дом"
      :error="props.addressError"
      :hint="addressHint"
      @blur="emits('blur', 'address')"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

import type { DeliveryAddress, DeliveryMethod } from '@brorepack/shared';
import { DELIVERY_METHODS, formatPrice, getDeliveryMethod } from '@brorepack/shared';

import { DELIVERY_METHOD } from '@/entities/order';
import { useTelegram } from '@/shared/telegram';
import type { SegmentedOption } from '@/shared/ui';
import { SegmentedControl } from '@/shared/ui';

import AddressField from './AddressField.vue';

const emits = defineEmits<{ blur: [field: 'address'] }>();
const method = defineModel<DeliveryMethod>('method', { required: true });
/** Адрес, город и координаты — одним объектом, меняются только вместе */
const address = defineModel<DeliveryAddress>('address', { required: true });
const isManualAddress = defineModel<boolean>('manual', { required: true });

const props = defineProps<{ addressError: string | null }>();

const telegram = useTelegram();

const methodOptions: SegmentedOption<DeliveryMethod>[] = DELIVERY_METHODS.map((item) => ({
  value: item.id,
  label: item.label,
  hint: formatPrice(item.price),
}));

const isPickupPoint = computed(() => method.value === DELIVERY_METHOD.cdekPickupPoint);
const addressHint = computed(() => {
  const eta = getDeliveryMethod(method.value).eta;
  return isPickupPoint.value
    ? `${eta} · адрес пункта можно найти на cdek.ru`
    : `${eta} · курьер позвонит перед доставкой`;
});

watch(method, () => {
  telegram.haptic.selection();
});
</script>

<style scoped>
.delivery-fields {
  display: grid;
  gap: 14px;
}
</style>
