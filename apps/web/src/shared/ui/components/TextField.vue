<template>
  <div
    class="text-field"
    :class="{ 'text-field--invalid': props.error, 'text-field--multiline': props.multiline }"
  >
    <label
      :for="inputId"
      :class="props.hideLabel ? 'visually-hidden' : 'section-label text-field__label'"
    >
      {{ props.label }}
    </label>
    <div class="text-field__box">
      <slot name="prefix" />
      <textarea
        v-if="props.multiline"
        :id="inputId"
        v-model="model"
        class="text-field__control"
        :name="props.name"
        :rows="props.rows"
        :maxlength="props.maxlength"
        :placeholder="props.placeholder"
        :aria-invalid="props.error ? 'true' : undefined"
        :aria-describedby="describedBy"
        @blur="emits('blur')"
      />
      <input
        v-else
        :id="inputId"
        v-model="model"
        class="text-field__control"
        :name="props.name"
        :type="props.type"
        :inputmode="props.inputmode"
        :autocomplete="props.autocomplete"
        :enterkeyhint="props.enterkeyhint"
        :autocapitalize="props.autocapitalize"
        :maxlength="props.maxlength"
        :placeholder="props.placeholder"
        :aria-invalid="props.error ? 'true' : undefined"
        :aria-describedby="describedBy"
        spellcheck="false"
        @blur="emits('blur')"
      />
      <span v-if="isCounterVisible" class="text-field__counter mono" aria-hidden="true">{{
        counterText
      }}</span>
      <slot name="suffix" />
    </div>
    <p v-if="props.error" :id="errorId" class="text-field__error appear" role="alert">{{ props.error }}</p>
    <p v-if="props.hint" :id="hintId" class="text-field__hint">{{ props.hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';

const emits = defineEmits<{ blur: [] }>();

const model = defineModel<string>({ required: true });

const props = withDefaults(
  defineProps<{
    label: string;
    hideLabel?: boolean;
    hint?: string;
    error?: string | null;
    placeholder?: string;
    maxlength?: number;
    counter?: boolean;
    type?: 'text' | 'tel' | 'search';
    inputmode?: 'text' | 'tel' | 'search';
    autocomplete?: string;
    enterkeyhint?: 'done' | 'go' | 'next' | 'search' | 'send';
    autocapitalize?: 'off' | 'words' | 'sentences';
    multiline?: boolean;
    rows?: number;
    name?: string;
  }>(),
  {
    hideLabel: false,
    hint: undefined,
    error: null,
    placeholder: undefined,
    maxlength: undefined,
    counter: false,
    type: 'text',
    inputmode: undefined,
    autocomplete: 'off',
    enterkeyhint: undefined,
    autocapitalize: undefined,
    multiline: false,
    rows: 3,
    name: undefined,
  },
);
defineSlots<{
  /** Иконка слева от поля */
  prefix?: () => unknown;
  /** Кнопка или подпись справа от поля */
  suffix?: () => unknown;
}>();

const inputId = `field-${useId()}`;
const hintId = `${inputId}-hint`;
const errorId = `${inputId}-error`;

const describedBy = computed(() => {
  const ids = [props.error ? errorId : null, props.hint ? hintId : null].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
});

const isCounterVisible = computed(() => props.counter && props.maxlength !== undefined);
const counterText = computed(() => `${model.value.length}/${props.maxlength}`);
</script>

<style scoped>
.text-field__label {
  display: block;
}

.text-field__box {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  color: var(--color-muted);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.text-field--multiline .text-field__box {
  align-items: flex-start;
  padding-top: 14px;
  padding-bottom: 14px;
}

.text-field__box:focus-within {
  border-color: var(--color-accent);
  box-shadow: var(--focus-ring);
}

.text-field--invalid .text-field__box {
  border-color: var(--color-danger);
}

.text-field__control {
  flex: 1;
  min-width: 0;
  padding: 0;
  background: none;
  border: 0;
  color: var(--color-text);
  font-size: 16px;
  line-height: 1.4;
}

textarea.text-field__control {
  resize: none;
}

.text-field__control::placeholder {
  color: var(--color-faint);
}

.text-field__control:focus,
.text-field__control:focus-visible {
  outline: none;
}

.text-field__counter {
  flex-shrink: 0;
  color: var(--color-faint);
  font-size: 12px;
}

.text-field__error {
  margin-top: 6px;
  color: var(--color-danger);
  font-size: 13px;
}

.text-field__hint {
  margin-top: 8px;
  color: var(--color-faint);
  font-size: 12px;
  line-height: 1.35;
}
</style>
