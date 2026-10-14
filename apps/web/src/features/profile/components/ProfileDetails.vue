<template>
  <div class="profile-details">
    <MockDataNotice v-if="isMockData" class="profile-details__mock" />

    <section class="profile-details__card card">
      <ProfileHeader :profile="props.profile" />
      <hr class="profile-details__divider" />
      <ProfileLevel :level="props.profile.level" :elo="props.profile.elo" />
    </section>

    <ProfileStats
      v-if="props.profile.stats"
      class="profile-details__stats"
      :stats="props.profile.stats"
    />

    <p v-if="!isMockData" class="profile-details__note">
      <AppIcon name="check" :size="16" />
      Данные из FACEIT · обновлено только что
    </p>

    <div class="profile-details__actions">
      <AppButton variant="link" @click="emits('changeNickname')">Это не мой профиль</AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FaceitProfile } from '@brorepack/shared';
import { computed } from 'vue';

import { MockDataNotice } from '@/entities/player';
import { AppButton, AppIcon } from '@/shared/ui';

import ProfileHeader from './ProfileHeader.vue';
import ProfileLevel from './ProfileLevel.vue';
import ProfileStats from './ProfileStats.vue';

const emits = defineEmits<{ changeNickname: [] }>();

const props = defineProps<{ profile: FaceitProfile }>();

const isMockData = computed(() => props.profile.source === 'mock');
</script>

<style scoped>
.profile-details__mock {
  margin-bottom: 12px;
}

.profile-details__card {
  padding: 20px;
}

.profile-details__divider {
  height: 1px;
  margin: 16px 0 18px;
  border: 0;
  background: var(--color-line);
}

.profile-details__stats {
  margin-top: 12px;
}

.profile-details__note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  color: var(--color-muted);
  font-size: 13px;
}

.profile-details__note :deep(svg) {
  color: var(--color-ok);
}

.profile-details__actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
