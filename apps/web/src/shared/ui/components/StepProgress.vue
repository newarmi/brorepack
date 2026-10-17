<template>
  <div class="step-progress">
    <p class="step-progress__label">
      <span class="step-progress__count mono">{{ props.current }}/{{ props.steps.length }}</span>
      {{ currentTitle }}
    </p>
    <ol class="step-progress__track" :aria-label="`Шаг ${props.current} из ${props.steps.length}`">
      <li
        v-for="(step, index) in props.steps"
        :key="step"
        class="step-progress__segment"
        :class="{ 'step-progress__segment--done': index < props.current }"
        :aria-current="index + 1 === props.current ? 'step' : undefined"
      >
        <span class="visually-hidden">{{ step }}</span>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Где пользователь в многошаговом сценарии: «2/4 Профиль» и полоска из сегментов

const props = defineProps<{
  steps: readonly string[];
  /** Номер текущего шага, с 1 */
  current: number;
}>();

const currentTitle = computed(() => props.steps[props.current - 1] ?? '');
</script>

<style scoped>
.step-progress__label {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  color: var(--color-muted);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.step-progress__count {
  color: var(--color-accent);
}

.step-progress__track {
  display: grid;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  gap: 4px;
}

.step-progress__segment {
  height: 3px;
  border-radius: 2px;
  background: var(--color-line-strong);
}

.step-progress__segment--done {
  background: var(--color-accent);
  box-shadow: 0 0 8px rgb(255 85 0 / 50%);
}
</style>
