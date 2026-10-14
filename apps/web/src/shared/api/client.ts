import { IS_GAS_TRANSPORT } from '@/shared/config/env';

import { gasTransport } from './transports/gas';
import { restTransport } from './transports/rest';
import type { ApiEndpoint } from './types';

const transport = IS_GAS_TRANSPORT ? gasTransport : restTransport;

/** Выполняет операцию API через выбранный транспорт (VITE_API_TRANSPORT) */
export const call = <T>(endpoint: ApiEndpoint, signal?: AbortSignal): Promise<T> => {
  return transport.request<T>(endpoint, signal);
};
