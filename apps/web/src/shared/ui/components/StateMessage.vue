<template>
  <section class="state-message card" :class="`state-message--${props.tone}`" role="status">
    <h2 class="state-message__title">{{ props.title }}</h2>
    <p v-if="props.text" class="state-message__text">{{ props.text }}</p>
    <div v-if="slots.default" class="state-message__actions">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{ title: string; text?: string; tone?: 'neutral' | 'error' }>(),
  {
    text: undefined,
    tone: 'neutral',
  },
);
const slots = defineSlots<{ default?: () => unknown }>();
</script>

<style scoped>
.state-message {
  padding: 28px 20px;
  text-align: center;
}

.state-message__title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.state-message--error .state-message__title {
  color: var(--color-text);
}

.state-message__text {
  margin-top: 8px;
  color: var(--color-muted);
  font-size: 14px;
}

.state-message__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}
</style>
