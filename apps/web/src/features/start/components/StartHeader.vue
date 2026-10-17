<template>
  <header class="start-header">
    <p class="start-header__brand">
      <span class="start-header__wordmark">BRO<span class="start-header__wordmark-tail">REPACK</span></span>
      <span class="start-header__motto">till we win</span>
    </p>
    <nav class="start-header__links" aria-label="Разделы">
      <RouterLink class="start-header__link" :to="{ name: ROUTE_NAMES.orders }"
        >Мои заказы</RouterLink
      >
      <RouterLink v-if="props.isAdmin" class="start-header__link" :to="{ name: ROUTE_NAMES.admin }"
        >Админка</RouterLink
      >
    </nav>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

import { ROUTE_NAMES } from '@/shared/config';

const props = defineProps<{ isAdmin: boolean }>();
</script>

<style scoped>
.start-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 12px;
  margin-bottom: 18px;
}

.start-header__brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.start-header__wordmark {
  font-size: var(--text-base);
  font-weight: 700;
  letter-spacing: 0.18em;
}

.start-header__wordmark-tail {
  color: var(--color-muted);
}

.start-header__motto {
  color: var(--color-accent);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.start-header__links {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  margin-left: auto;
}

.start-header__link {
  padding: 6px 10px;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-chip);
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
