<template>
  <label class="light-stand card">
    <span class="light-stand__icon" aria-hidden="true">
      <AppIcon name="bolt" :size="20" />
    </span>
    <span class="light-stand__body">
      <span class="light-stand__title">{{ LIGHT_STAND.label }}</span>
      <span class="light-stand__details">
        <span class="light-stand__nowrap">{{ price }}</span> ·
        <template v-for="(part, index) in descriptionParts" :key="part">
          <span class="light-stand__nowrap"
            >{{ part }}{{ index < descriptionParts.length - 1 ? ',' : '' }}</span
          >
          {{ ' ' }}
        </template>
      </span>
    </span>
    <ToggleSwitch v-model="model" />
  </label>
</template>

<script setup lang="ts">
import { formatPrice, LIGHT_STAND } from '@brorepack/shared';
import { watch } from 'vue';

import { useTelegram } from '@/shared/telegram';
import { AppIcon, ToggleSwitch } from '@/shared/ui';

const model = defineModel<boolean>({ required: true });

const telegram = useTelegram();

const price = `+${formatPrice(LIGHT_STAND.price)}`;
// Части описания не разрываем внутри («USB-C» не должен переноситься по дефису)
const descriptionParts = LIGHT_STAND.description.split(', ');

watch(model, () => telegram.haptic.selection());
</script>

<style scoped>
.light-stand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  cursor: pointer;
}

.light-stand__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--color-surface-2);
  color: var(--color-accent-hi);
}

.light-stand__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.light-stand__title {
  font-size: 15px;
  font-weight: 600;
}

.light-stand__details {
  color: var(--color-muted);
  font-size: 12px;
}

.light-stand__nowrap {
  white-space: nowrap;
}
</style>
