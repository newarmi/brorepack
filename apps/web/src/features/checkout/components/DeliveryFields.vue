<template>
  <section class="delivery-fields">
    <SegmentedControl v-model="method" :options="methodOptions" label="Доставка" />
    <TextField
      v-model="city"
      label="Город"
      name="city"
      autocomplete="address-level2"
      autocapitalize="words"
      placeholder="Москва"
      :maxlength="64"
      :error="props.cityError"
      @blur="emits('blur', 'city')"
    />
    <TextField
      v-model="address"
      :label="addressLabel"
      name="address"
      autocomplete="street-address"
      :placeholder="addressPlaceholder"
      :maxlength="200"
      :error="props.addressError"
      :hint="addressHint"
      @blur="emits('blur', 'address')"
    />
  </section>
</template>

<script setup lang="ts">
import type { DeliveryMethod } from '@brorepack/shared';
import { DELIVERY_METHODS, formatPrice, getDeliveryMethod } from '@brorepack/shared';
import { computed, watch } from 'vue';

import { useTelegram } from '@/shared/telegram';
import type { SegmentedOption } from '@/shared/ui';
import { SegmentedControl, TextField } from '@/shared/ui';

const emits = defineEmits<{ blur: [field: 'city' | 'address'] }>();
const method = defineModel<DeliveryMethod>('method', { required: true });
const city = defineModel<string>('city', { required: true });
const address = defineModel<string>('address', { required: true });

const props = defineProps<{ cityError: string | null; addressError: string | null }>();

const telegram = useTelegram();

const methodOptions: SegmentedOption<DeliveryMethod>[] = DELIVERY_METHODS.map((item) => ({
  value: item.id,
  label: item.label,
  hint: formatPrice(item.price),
}));

const isPickupPoint = computed(() => method.value === 'cdek_pvz');
const addressLabel = computed(() => (isPickupPoint.value ? 'Адрес пункта СДЭК' : 'Адрес доставки'));
const addressPlaceholder = computed(() =>
  isPickupPoint.value ? 'Например, Тверская, 7' : 'Улица, дом, квартира',
);
const addressHint = computed(() => {
  const eta = getDeliveryMethod(method.value).eta;
  return isPickupPoint.value
    ? `${eta} · адрес пункта можно найти на cdek.ru`
    : `${eta} · курьер позвонит перед доставкой`;
});

watch(method, () => telegram.haptic.selection());
</script>

<style scoped>
.delivery-fields {
  display: grid;
  gap: 14px;
}
</style>
