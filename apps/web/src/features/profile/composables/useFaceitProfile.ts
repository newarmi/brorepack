import type { MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';

import { useAsyncData } from '@/shared/lib';

import { fetchFaceitPlayer } from '../api/faceit';

/** Загружает профиль FACEIT по нику и перезагружает при смене ника */
export const useFaceitProfile = (nickname: MaybeRefOrGetter<string>) => {
  const {
    data: profile,
    status,
    error,
    load: reload,
  } = useAsyncData(
    (signal) => fetchFaceitPlayer(toValue(nickname), signal),
    [() => toValue(nickname)],
  );

  return { profile, status, error, reload };
};

export default useFaceitProfile;
