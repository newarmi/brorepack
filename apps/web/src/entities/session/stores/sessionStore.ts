import type { MeResponse } from '@brorepack/shared';
import { defineStore } from 'pinia';
import { computed, shallowRef } from 'vue';

import { fetchMe } from '../api/me';

export type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Текущий пользователь: нужен почти везде (ссылка на админку, guard) */
export const useSessionStore = defineStore('session', () => {
  const me = shallowRef<MeResponse | null>(null);
  const status = shallowRef<SessionStatus>('idle');
  const error = shallowRef<unknown>(null);

  const isAdmin = computed(() => me.value?.isAdmin ?? false);

  let pending: Promise<void> | null = null;

  const requestMe = async (): Promise<void> => {
    status.value = 'loading';
    try {
      me.value = await fetchMe();
      status.value = 'ready';
      error.value = null;
    } catch (loadError) {
      status.value = 'error';
      error.value = loadError;
    } finally {
      pending = null;
    }
  };

  /** Грузит /api/me один раз; повторные вызовы ждут тот же запрос */
  const load = (): Promise<void> => {
    if (status.value === 'ready') {
      return Promise.resolve();
    }
    pending ??= requestMe();
    return pending;
  };

  return { me, status, error, isAdmin, load };
});
