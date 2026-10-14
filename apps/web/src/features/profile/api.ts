import type { FaceitProfile } from '@brorepack/shared';

import { call } from '@/shared/api/client';

export const fetchFaceitPlayer = (
  nickname: string,
  signal?: AbortSignal,
): Promise<FaceitProfile> => {
  return call<FaceitProfile>(
    {
      rest: { path: '/faceit/player', query: { nickname } },
      gas: { action: 'faceit.player', params: { nickname } },
    },
    signal,
  );
};
