<template>
  <div class="profile-header">
    <div class="profile-header__avatar">
      <img
        v-if="props.profile.avatarUrl"
        :src="props.profile.avatarUrl"
        alt=""
        referrerpolicy="no-referrer"
      />
      <span v-else aria-hidden="true">{{ initial }}</span>
    </div>
    <div class="profile-header__body">
      <h1 class="profile-header__name">{{ props.profile.nickname }}</h1>
      <p class="profile-header__meta">{{ subtitle }}</p>
    </div>
    <span class="profile-header__chip">
      <AppIcon name="check" :size="14" />
      Найден
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { FaceitProfile } from '@brorepack/shared';

import { formatCountry } from '@/shared/lib';
import { AppIcon } from '@/shared/ui';

const props = defineProps<{ profile: FaceitProfile }>();

const initial = computed(() => props.profile.nickname.charAt(0).toUpperCase());
const subtitle = computed(() =>
  [formatCountry(props.profile.country), 'CS2'].filter(Boolean).join(' · '),
);
</script>

<style scoped>
.profile-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile-header__avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  overflow: hidden;
  border: 2px solid var(--color-accent);
  border-radius: 50%;
  background: var(--color-surface-2);
  color: var(--color-accent-hi);
  font-size: 20px;
  font-weight: 700;
}

.profile-header__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-header__body {
  flex: 1;
  min-width: 0;
}

.profile-header__name {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.profile-header__meta {
  margin-top: 2px;
  color: var(--color-muted);
  font-size: 13px;
}

.profile-header__chip {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-chip);
  background: var(--color-ok-soft);
  color: var(--color-ok);
  font-size: 12px;
  font-weight: 700;
}
</style>
