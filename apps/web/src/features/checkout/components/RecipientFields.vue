<template>
  <fieldset class="recipient-fields">
    <legend class="visually-hidden">Получатель</legend>
    <TextField
      v-model="name"
      label="Имя получателя"
      name="name"
      autocomplete="name"
      autocapitalize="words"
      placeholder="Иван Иванов"
      :maxlength="80"
      :error="props.nameError"
      @blur="emits('blur', 'name')"
    />
    <TextField
      v-model="phone"
      label="Телефон"
      name="phone"
      type="tel"
      inputmode="tel"
      autocomplete="tel"
      placeholder="+7 (___) ___-__-__"
      :maxlength="24"
      :error="props.phoneError"
      @blur="emits('blur', 'phone')"
    >
      <template #suffix>
        <button
          type="button"
          class="recipient-fields__contact"
          :disabled="props.isPhoneRequesting"
          @click="emits('requestPhone')"
        >
          Из Telegram
        </button>
      </template>
    </TextField>
  </fieldset>
</template>

<script setup lang="ts">
import { TextField } from '@/shared/ui';

const emits = defineEmits<{ blur: [field: 'name' | 'phone']; requestPhone: [] }>();
const name = defineModel<string>('name', { required: true });
const phone = defineModel<string>('phone', { required: true });

const props = defineProps<{
  nameError: string | null;
  phoneError: string | null;
  isPhoneRequesting: boolean;
}>();
</script>

<style scoped>
.recipient-fields {
  display: grid;
  gap: 14px;
}

.recipient-fields__contact {
  flex-shrink: 0;
  padding: 6px 4px;
  border-radius: 8px;
  color: var(--color-accent-hi);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  transition: opacity var(--transition-fast);
}

.recipient-fields__contact:active:not(:disabled) {
  opacity: 0.6;
}

.recipient-fields__contact:disabled {
  opacity: 0.5;
}
</style>
