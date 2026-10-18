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
    <!-- Поле адреса зависит от способа доставки: при переключении вкладки оно сменяется слайдом в её сторону -->
    <div class="delivery-fields__address">
      <Transition :name="addressTransition">
        <TextField
          :key="method"
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
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue';

import type { DeliveryMethod } from '@brorepack/shared';
import { DELIVERY_METHODS, formatPrice, getDeliveryMethod } from '@brorepack/shared';

import { DELIVERY_METHOD } from '@/entities/order';
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

const isPickupPoint = computed(() => method.value === DELIVERY_METHOD.cdekPickupPoint);
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

const addressTransition = shallowRef<'tab-forward' | 'tab-back'>('tab-forward');

const getMethodIndex = (value: DeliveryMethod): number => {
  return DELIVERY_METHODS.findIndex((item) => item.id === value);
};

// Watch срабатывает до перерисовки, поэтому направление успевает попасть в <Transition>
watch(method, (nextMethod, previousMethod) => {
  telegram.haptic.selection();
  addressTransition.value =
    getMethodIndex(nextMethod) > getMethodIndex(previousMethod) ? 'tab-forward' : 'tab-back';
});
</script>

<style scoped>
.delivery-fields {
  display: grid;
  gap: 14px;
}

.delivery-fields__address {
  position: relative;
}
</style>
