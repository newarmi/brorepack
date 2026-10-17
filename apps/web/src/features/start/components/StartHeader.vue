<template>
  <header class="start-header">
    <p class="start-header__brand">
      <span class="start-header__wordmark">BROREPACK</span>
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
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.start-header__motto {
  color: var(--color-muted);
  font-size: 12px;
  white-space: nowrap;
}

.start-header__links {
  display: flex;
  flex-shrink: 0;
  gap: 4px;
  margin: 0 -8px 0 auto;
}

.start-header__link {
  padding: 6px 8px;
  border-radius: 8px;
  color: var(--color-accent-hi);
  font-size: 13px;
  font-weight: 400;
  white-space: nowrap;
}
</style>
