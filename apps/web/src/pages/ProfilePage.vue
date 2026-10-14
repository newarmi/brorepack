<template>
  <div class="profile-page">
    <AsyncState
      :status="status"
      :errorTitle="getProfileErrorTitle(error)"
      :errorText="getProfileErrorText(error, nickname)"
    >
      <template #loading>
        <ProfileSkeleton />
      </template>

      <template #errorActions>
        <AppButton v-if="isNotFound" variant="primary" block @click="changeNicknameHandler">
          Изменить ник
        </AppButton>
        <template v-else>
          <AppButton variant="primary" icon="refresh" block @click="reload">Повторить</AppButton>
          <AppButton variant="link" block @click="changeNicknameHandler">Изменить ник</AppButton>
        </template>
      </template>

      <ProfileDetails v-if="profile" :profile="profile" @changeNickname="changeNicknameHandler" />
    </AsyncState>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useDraftStore } from '@/entities/draft/store';
import ProfileDetails from '@/features/profile/ProfileDetails.vue';
import {
  checkPlayerNotFound,
  getProfileErrorText,
  getProfileErrorTitle,
} from '@/features/profile/profileErrors';
import ProfileSkeleton from '@/features/profile/ProfileSkeleton.vue';
import { useFaceitProfile } from '@/features/profile/useFaceitProfile';
import { ROUTE_NAMES } from '@/shared/config/routes';
import { useMainButton } from '@/shared/telegram/useMainButton';
import { useTelegram } from '@/shared/telegram/useTelegram';
import AppButton from '@/shared/ui/AppButton.vue';
import AsyncState from '@/shared/ui/AsyncState.vue';

const route = useRoute();
const router = useRouter();
const telegram = useTelegram();
const draft = useDraftStore();

const nickname = computed(() => String(route.params.nickname ?? ''));
const { profile, status, error, reload } = useFaceitProfile(nickname);

const isNotFound = computed(() => checkPlayerNotFound(error.value));

const changeNicknameHandler = (): void => {
  void router.replace({ name: ROUTE_NAMES.nickname });
};

const buildPlaqueHandler = (): void => {
  if (!profile.value) {
    return;
  }
  telegram.haptic.impact('medium');
  draft.setProfile(profile.value);
  void router.push({ name: ROUTE_NAMES.constructor });
};

useMainButton({
  text: 'Собрать плашку',
  visible: () => status.value === 'ready',
  onClick: buildPlaqueHandler,
});
</script>
