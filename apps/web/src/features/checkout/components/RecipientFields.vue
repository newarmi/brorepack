<template>
  <fieldset class="recipient-fields">
    <legend class="section-label">Получатель</legend>
    <TextField
      v-model="name"
      label="Имя и фамилия"
      hideLabel
      name="name"
      autocomplete="name"
      autocapitalize="words"
      placeholder="Имя и фамилия"
      :maxlength="80"
      :error="props.nameError"
      @blur="emits('blur', 'name')"
    />
    <TextField
      v-model="phone"
      label="Телефон"
      hideLabel
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
  gap: 10px;
}

.recipient-fields__contact {
  flex-shrink: 0;
  padding: 6px 4px;
  border-radius: 8px;
  color: var(--color-accent-hi);
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.recipient-fields__contact:disabled {
  opacity: 0.5;
}
</style>
