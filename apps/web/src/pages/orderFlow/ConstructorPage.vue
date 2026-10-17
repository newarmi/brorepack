<template>
  <div class="constructor-page">
    <StepProgress :steps="ORDER_FLOW_STEPS" :current="ORDER_FLOW_STEP.plaque" />

    <MockDataNotice v-if="isMockProfile" />

    <PlaqueStage :design="draft.design" :lightStand="draft.lightStand" isRatingVisible />

    <TemplatePicker v-model="draft.templateId" :design="draft.design" />

    <TextField
      v-if="isCustomTemplate"
      v-model="draft.comment"
      label="Что хочешь на плашке?"
      multiline
      :rows="3"
      :maxlength="500"
      placeholder="Цвета, персонаж, отсылка к любимой карте…"
      :hint="customTemplateHint"
    />

    <TextField
      v-model="draft.displayName"
      label="Надпись"
      :maxlength="DISPLAY_NAME_MAX"
      counter
      :error="displayNameError"
      enterkeyhint="done"
    />

    <LightStandRow v-model="draft.lightStand" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { DISPLAY_NAME_MAX, formatPrice, getTemplate } from '@brorepack/shared';

import { ORDER_FLOW_STEP, ORDER_FLOW_STEPS, useDraftStore } from '@/entities/draft';
import { CUSTOM_TEMPLATE_ID } from '@/entities/plaque';
import { MockDataNotice } from '@/entities/player';
import {
  LightStandRow,
  PlaqueStage,
  TemplatePicker,
  useDesignValidation,
} from '@/features/editor';
import { ROUTE_NAMES } from '@/shared/config';
import { useMainButton, useTelegram } from '@/shared/telegram';
import { StepProgress, TextField } from '@/shared/ui';

const router = useRouter();
const telegram = useTelegram();
const draft = useDraftStore();
const { isDesignValid, displayNameError } = useDesignValidation();

const customTemplateHint = getTemplate(CUSTOM_TEMPLATE_ID).description;

const isCustomTemplate = computed(() => draft.templateId === CUSTOM_TEMPLATE_ID);
const isMockProfile = computed(() => draft.profile?.source === 'mock');

const nextHandler = (): void => {
  if (!isDesignValid.value) {
    telegram.haptic.notify('error');
    return;
  }
  telegram.haptic.impact('light');
  void router.push({ name: ROUTE_NAMES.checkout });
};

useMainButton({
  text: () => `Далее · ${formatPrice(draft.plaquePrice.total)}`,
  disabled: () => !isDesignValid.value,
  onClick: nextHandler,
});
</script>

<style scoped>
.constructor-page {
  display: grid;
  gap: 20px;
}
</style>
