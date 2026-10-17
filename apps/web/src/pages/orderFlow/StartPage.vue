<template>
  <div class="start-page">
    <StartHeader :isAdmin="session.isAdmin" />

    <h1 class="start-page__title">Плашка за твой уровень на FACEIT</h1>
    <p class="start-page__subtitle">
      Выбери дизайн. Уровень и ELO подтянем прямо из FACEIT — на плашке будут только настоящие
      цифры.
    </p>

    <TemplatePicker
      v-model="draft.templateId"
      class="start-page__picker"
      :design="previewDesign"
      label="Дизайн"
      showcase
    />

    <StartSteps />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useDraftStore } from '@/entities/draft';
import { useSessionStore } from '@/entities/session';
import { TemplatePicker } from '@/features/editor';
import { createSampleDesign, StartHeader, StartSteps } from '@/features/start';
import { ROUTE_NAMES } from '@/shared/config';
import { useMainButton, useTelegram } from '@/shared/telegram';

// Шаг 1 из 3: выбор дизайна. Ник и настоящий рейтинг из FACEIT — на следующих экранах
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
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  text-wrap: balance;
}

.start-page__subtitle {
  margin-top: 12px;
  color: var(--color-muted);
  font-size: 15px;
}

.start-page__picker {
  margin: 22px 0 18px;
}
</style>
