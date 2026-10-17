<template>
  <div class="nickname-page">
    <StepProgress :steps="ORDER_FLOW_STEPS" :current="ORDER_FLOW_STEP.profile" />

    <h1 class="page-title nickname-page__title">Твой ник на FACEIT</h1>
    <p class="nickname-page__subtitle">
      Уровень и ELO возьмём из профиля FACEIT — вписать их вручную нельзя.
    </p>

    <form class="nickname-page__form" novalidate @submit.prevent="submit">
      <TextField
        v-model="draft.nickname"
        label="Ник на FACEIT"
        name="nickname"
        enterkeyhint="search"
        autocapitalize="off"
        placeholder="например, goodlifeee"
        :maxlength="32"
        :error="nicknameError"
        hint="Как в профиле FACEIT, не в Steam. Найти: приложение FACEIT → аватар → ник под ним"
        autofocus
        @blur="touch"
      >
        <template #prefix>
          <AppIcon name="search" :size="18" />
        </template>
      </TextField>
    </form>

    <PlaqueStage :design="previewDesign" :lightStand="draft.lightStand" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { ORDER_FLOW_STEP, ORDER_FLOW_STEPS, useDraftStore } from '@/entities/draft';
import { PlaqueStage } from '@/features/editor';
import { createNicknamePreview, useNicknameForm } from '@/features/nickname';
import { useMainButton } from '@/shared/telegram';
import { AppIcon, StepProgress, TextField } from '@/shared/ui';

// Шаг 2 из 4: ник. Уровень и ELO вручную не вводятся — их отдаёт FACEIT на следующем экране
const draft = useDraftStore();
const { isNicknameValid, nicknameError, touch, submit } = useNicknameForm();

// Плашка с вводимым ником: видно, что получится, а уровень подтянется из FACEIT
const previewDesign = computed(() => createNicknamePreview(draft.design, draft.nickname));

useMainButton({
  text: 'Найти профиль',
  disabled: () => !isNicknameValid.value,
  onClick: submit,
});
</script>

<style scoped>
.nickname-page__title {
  margin-top: 20px;
}

.nickname-page__subtitle {
  margin-top: 10px;
  color: var(--color-muted);
}

.nickname-page__form {
  margin: 20px 0;
}
</style>
