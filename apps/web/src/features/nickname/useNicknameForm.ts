import { nicknameSchema } from '@brorepack/shared';
import { computed, shallowRef } from 'vue';
import { useRouter } from 'vue-router';

import { useDraftStore } from '@/entities/draft/store';
import { ROUTE_NAMES } from '@/shared/config/routes';
import { useTelegram } from '@/shared/telegram/useTelegram';

/** Ник FACEIT: ошибка видна после blur или попытки отправить, пустое поле ошибкой не считается */
export const useNicknameForm = () => {
  const router = useRouter();
  const telegram = useTelegram();
  const draft = useDraftStore();

  const isTouched = shallowRef(false);

  const nicknameResult = computed(() => nicknameSchema.safeParse(draft.nickname));
  const isNicknameValid = computed(() => nicknameResult.value.success);

  const nicknameError = computed(() => {
    const result = nicknameResult.value;
    if (result.success || !isTouched.value || !draft.nickname.trim()) {
      return null;
    }
    return result.error.issues[0]?.message ?? 'Проверь ник';
  });

  const touch = (): void => {
    isTouched.value = true;
  };

  const submit = (): void => {
    touch();
    const result = nicknameResult.value;
    if (!result.success) {
      telegram.haptic.notify('error');
      return;
    }
    telegram.haptic.impact('light');
    void router.push({ name: ROUTE_NAMES.profile, params: { nickname: result.data } });
  };

  return { isNicknameValid, nicknameError, touch, submit };
};

export default useNicknameForm;
