<template>
  <ol class="start-steps" aria-label="Как это работает">
    <li v-for="(step, index) in STEPS" :key="step.title" class="start-steps__item">
      <span class="start-steps__index mono">{{ index + 1 }}</span>
      <span class="start-steps__title">{{ step.title }}</span>
      <span class="start-steps__text">{{ step.text }}</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
const STEPS = [
  { title: 'Дизайн', text: 'шаблон и надпись' },
  { title: 'Ник', text: 'рейтинг из FACEIT' },
  { title: 'Оплата', text: 'и доставка' },
] as const;
</script>

<style scoped>
.start-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.start-steps__item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: var(--color-surface);
  border-radius: 14px;
}

.start-steps__index {
  margin-bottom: 6px;
  color: var(--color-accent-hi);
  font-size: 13px;
  font-weight: 700;
}

.start-steps__title {
  font-size: 15px;
  font-weight: 700;
}

.start-steps__text {
  color: var(--color-muted);
  font-size: 12px;
}
</style>
