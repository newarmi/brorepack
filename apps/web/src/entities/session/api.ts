import type { MeResponse } from '@brorepack/shared';

import { call } from '@/shared/api/client';

export const fetchMe = (): Promise<MeResponse> => {
  return call<MeResponse>({
    rest: { path: '/me' },
    gas: { action: 'me' },
  });
};
