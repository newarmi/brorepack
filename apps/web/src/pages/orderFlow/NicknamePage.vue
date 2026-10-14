<template>
  <div class="nickname-page">
    <h1 class="page-title nickname-page__title">Твой ник на FACEIT</h1>
    <p class="nickname-page__subtitle">
      Уровень и ELO возьмём из твоего профиля FACEIT. Вписать их вручную нельзя — так плашка
      подтверждает настоящий результат.
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
  </div>
</template>

<script setup lang="ts">
import { useDraftStore } from '@/entities/draft';
import { useNicknameForm } from '@/features/nickname';
import { useMainButton } from '@/shared/telegram';
import { AppIcon, TextField } from '@/shared/ui';

// Шаг 2 из 3: ник. Уровень и ELO вручную не вводятся — их отдаёт FACEIT на следующем экране
const draft = useDraftStore();
const { isNicknameValid, nicknameError, touch, submit } = useNicknameForm();

useMainButton({
  text: 'Найти профиль',
  disabled: () => !isNicknameValid.value,
  onClick: submit,
});
</script>

<style scoped>
.nickname-page__title {
  margin-top: 8px;
  line-height: 1.2;
}

.nickname-page__subtitle {
  margin-top: 12px;
  color: var(--color-muted);
  font-size: 15px;
}

.nickname-page__form {
  margin-top: 22px;
}
</style>
