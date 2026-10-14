<template>
  <section class="details-list card">
    <h2 class="card-title">{{ props.title }}</h2>
    <dl class="details-list__rows">
      <div v-for="item in props.items" :key="item.label" class="details-list__row">
        <dt>{{ item.label }}</dt>
        <dd :class="{ selectable: item.selectable }">{{ item.value }}</dd>
      </div>
    </dl>
    <slot />
  </section>
</template>

<script setup lang="ts">
import type { DetailsItem } from './types';

const props = defineProps<{ title: string; items: DetailsItem[] }>();
</script>

<style scoped>
.details-list {
  padding: 16px 20px;
}

.details-list__rows {
  display: grid;
  gap: 10px;
}

.details-list__row {
  display: grid;
  grid-template-columns: minmax(96px, 38%) 1fr;
  gap: 12px;
  font-size: 14px;
}

.details-list__row dt {
  color: var(--color-muted);
}

.details-list__row dd {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-line;
}
</style>
