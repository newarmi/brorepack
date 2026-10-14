<template>
  <slot v-if="props.status === 'loading'" name="loading" />

  <StateMessage
    v-else-if="props.status === 'error'"
    :title="props.errorTitle"
    :text="props.errorText"
    tone="error"
  >
    <slot name="errorActions">
      <AppButton variant="primary" icon="refresh" block @click="emits('retry')"
        >Повторить</AppButton
      >
    </slot>
  </StateMessage>

  <StateMessage v-else-if="props.isEmpty" :title="props.emptyTitle" :text="props.emptyText">
    <template v-if="$slots.emptyActions" #default>
      <slot name="emptyActions" />
    </template>
  </StateMessage>

  <slot v-else />
</template>

<script setup lang="ts">
import type { AsyncStatus } from '@/shared/lib/composables/useAsyncData';

import AppButton from './AppButton.vue';
import StateMessage from './StateMessage.vue';

// Четыре состояния экрана с загрузкой: скелетон → ошибка с «Повторить» → пусто → данные

const emits = defineEmits<{ retry: [] }>();

const props = withDefaults(
  defineProps<{
    status: AsyncStatus;
    errorTitle: string;
    errorText?: string;
    isEmpty?: boolean;
    emptyTitle?: string;
    emptyText?: string;
  }>(),
  { errorText: undefined, isEmpty: false, emptyTitle: '', emptyText: undefined },
);
</script>
