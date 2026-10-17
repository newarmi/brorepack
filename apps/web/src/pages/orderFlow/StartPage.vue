<template>
  <div class="start-page">
    <StartHeader :isAdmin="session.isAdmin" />

    <h1 class="start-page__title">Плашка за твой уровень на FACEIT</h1>
    <p class="start-page__subtitle">
      Акрил A5 с твоим ником. Уровень и ELO подтянем из FACEIT — только настоящие цифры.
    </p>

    <StepProgress
      class="start-page__steps"
      :steps="ORDER_FLOW_STEPS"
      :current="ORDER_FLOW_STEP.design"
    />

    <PlaqueStage :design="previewDesign" :lightStand="draft.lightStand" />

    <TemplatePicker
      v-model="draft.templateId"
      class="start-page__picker"
      :design="previewDesign"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { ORDER_FLOW_STEP, ORDER_FLOW_STEPS, useDraftStore } from '@/entities/draft';
import { useSessionStore } from '@/entities/session';
import { PlaqueStage, TemplatePicker } from '@/features/editor';
import { createSampleDesign, StartHeader } from '@/features/start';
import { ROUTE_NAMES } from '@/shared/config';
import { useMainButton, useTelegram } from '@/shared/telegram';
import { StepProgress } from '@/shared/ui';

// Шаг 1 из 4: выбор дизайна. Ник и настоящий рейтинг из FACEIT — на следующих экранах
const router = useRouter();
const telegram = useTelegram();
const draft = useDraftStore();
const session = useSessionStore();

// Пока профиля нет, витрина показывает пример; после поиска — плашку с ником и рейтингом игрока
const previewDesign = computed(() =>
  draft.hasProfile ? draft.design : createSampleDesign(draft.templateId),
);

const nextHandler = (): void => {
  telegram.haptic.impact('light');
  void router.push({ name: ROUTE_NAMES.nickname });
};

useMainButton({
  text: 'Дальше — ник на FACEIT',
  onClick: nextHandler,
});
</script>

<style scoped>
.start-page__title {
  margin-top: 8px;
  font-size: var(--text-2xl);
  font-weight: 700;
  line-height: 1.05;
  text-transform: uppercase;
  text-wrap: balance;
}

.start-page__subtitle {
  margin-top: 12px;
  color: var(--color-muted);
}

.start-page__steps {
  margin: 20px 0 16px;
}

.start-page__picker {
  margin-top: 20px;
}
</style>
