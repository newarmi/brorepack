<template>
  <dl class="profile-stats">
    <div v-for="item in items" :key="item.label" class="profile-stats__item">
      <dt class="profile-stats__label">{{ item.label }}</dt>
      <dd class="profile-stats__value mono">{{ item.value }}</dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import type { FaceitStats } from '@brorepack/shared';
import { computed } from 'vue';

import { formatNumber } from '@/shared/lib';

const props = defineProps<{ stats: FaceitStats }>();

const items = computed(() => [
  { label: 'Матчи', value: formatNumber(props.stats.matches) },
  { label: 'Винрейт', value: `${Math.round(props.stats.winRate)}%` },
  { label: 'K/D', value: props.stats.kd.toFixed(2) },
  { label: 'Хедшоты', value: `${Math.round(props.stats.headshots)}%` },
]);
</script>

<style scoped>
.profile-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.profile-stats__item {
  padding: 14px 16px;
  background: var(--color-surface);
  border-radius: 16px;
}

.profile-stats__label {
  color: var(--color-muted);
  font-size: 13px;
}

.profile-stats__value {
  margin: 4px 0 0;
  font-size: 20px;
  font-weight: 700;
}
</style>
