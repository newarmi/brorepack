import type { ApiError as ApiErrorBody } from '@brorepack/shared';

import { API_ERROR_CODES, ApiError } from '@/shared/api/errors';
import { readJson, sendRequest } from '@/shared/api/http';
import type { ApiTransport, GasEndpoint } from '@/shared/api/types';
import { GAS_URL } from '@/shared/config/env';
import { getAuthPayload } from '@/shared/telegram/auth';

// --- Google Apps Script (docs/gas.md) ---

type GasEnvelope = { ok: true; data: unknown } | ({ ok: false; status: number } & ApiErrorBody);

const isGasEnvelope = (value: unknown): value is GasEnvelope => {
  return (
    typeof value === 'object' && value !== null && typeof (value as GasEnvelope).ok === 'boolean'
  );
};

/**
 * Apps Script не видит заголовки и всегда отвечает 200, поэтому подпись и действие — в теле,
 * статус — в ответе. text/plain без своих заголовков = «простой» запрос без CORS-preflight.
 */
export const gasTransport: ApiTransport = {
  request: async <T>(endpoint: { gas: GasEndpoint }, signal?: AbortSignal) => {
    const { action, params } = endpoint.gas;
    const response = await sendRequest(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, auth: getAuthPayload(), params: params ?? {} }),
      redirect: 'follow',
      signal,
    });

    const data = await readJson(response);
    if (!isGasEnvelope(data)) {
      throw new ApiError(response.status || 0, API_ERROR_CODES.serverError);
    }
    if (!data.ok) {
      throw new ApiError(data.status, data.error, data.message);
    }
    return data.data as T;
  },
};
