<template>
  <ol class="order-timeline card" aria-label="Статус заказа">
    <li
      v-for="step in steps"
      :key="step.status"
      class="order-timeline__step"
      :class="`order-timeline__step--${step.state}`"
      :aria-current="step.state === 'current' ? 'step' : undefined"
    >
      <span class="order-timeline__marker" aria-hidden="true">
        <AppIcon v-if="step.state === 'done'" name="check" :size="14" />
      </span>
      <div class="order-timeline__body">
        <p class="order-timeline__label">{{ step.label }}</p>
        <p
          v-if="step.note"
          class="order-timeline__note"
          :class="{
            'order-timeline__note--accent': step.isNoteAccent,
            selectable: step.status === 'shipped',
          }"
        >
          {{ step.note }}
        </p>
      </div>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { AppIcon } from '@/shared/ui';

import type { TimelineOrder } from '../utils/timeline';
import { buildTimelineSteps } from '../utils/timeline';

const props = defineProps<{ order: TimelineOrder }>();

const steps = computed(() => buildTimelineSteps(props.order));
</script>

<style scoped>
.order-timeline {
  padding: 18px 20px;
}

.order-timeline__step {
  position: relative;
  display: flex;
  gap: 14px;
  padding-bottom: 20px;
}

.order-timeline__step:last-child {
  padding-bottom: 0;
}

/* Соединительная линия между маркерами */
.order-timeline__step:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 30px;
  bottom: 6px;
  left: 11px;
  width: 2px;
  border-radius: 1px;
  background: var(--color-line);
}

.order-timeline__step--done:not(:last-child)::after {
  background: var(--color-ok);
}

.order-timeline__marker {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-surface-2);
  color: var(--color-bg);
}

.order-timeline__step--done .order-timeline__marker {
  background: var(--color-ok);
}

.order-timeline__step--current .order-timeline__marker {
  background: transparent;
  border: 2px solid var(--color-accent);
}

.order-timeline__step--current .order-timeline__marker::after {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-accent);
}

.order-timeline__body {
  min-width: 0;
  padding-top: 1px;
}

.order-timeline__label {
  font-size: 15px;
  font-weight: 600;
}

.order-timeline__step--todo .order-timeline__label {
  color: var(--color-muted);
}

.order-timeline__note {
  margin-top: 2px;
  color: var(--color-muted);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.order-timeline__note--accent {
  color: var(--color-accent-hi);
}
</style>
