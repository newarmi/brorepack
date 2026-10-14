<template>
  <div class="constructor-page">
    <MockDataNotice v-if="isMockProfile" />

    <PlaqueStage :design="draft.design" />

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

    <RatingNote :level="draft.design.level" :elo="draft.design.elo" />

    <LightStandRow v-model="draft.lightStand" />
  </div>
</template>

<script setup lang="ts">
import { DISPLAY_NAME_MAX, formatPrice, getTemplate } from '@brorepack/shared';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useDraftStore } from '@/entities/draft/store';
import { CUSTOM_TEMPLATE_ID } from '@/entities/plaque/constants';
import MockDataNotice from '@/entities/player/MockDataNotice.vue';
import LightStandRow from '@/features/editor/LightStandRow.vue';
import PlaqueStage from '@/features/editor/PlaqueStage.vue';
import RatingNote from '@/features/editor/RatingNote.vue';
import TemplatePicker from '@/features/editor/TemplatePicker.vue';
import { useDesignValidation } from '@/features/editor/useDesignValidation';
import { ROUTE_NAMES } from '@/shared/config/routes';
import { useMainButton } from '@/shared/telegram/useMainButton';
import { useTelegram } from '@/shared/telegram/useTelegram';
import TextField from '@/shared/ui/TextField.vue';

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
