import type { ApiError as ApiErrorBody } from '@brorepack/shared';

import { getAuthPayload } from '@/shared/telegram/webApp/auth';

import { API_ERROR_CODES, ApiError } from '../errors';
import type { ApiTransport, QueryValue, RestEndpoint } from '../types';
import { readJson, sendRequest } from './http';

// REST для apps/server: запросы на /api/*, подпись Telegram — в заголовке Authorization

const API_BASE = '/api';

const buildUrl = (path: string, query?: Record<string, QueryValue>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const search = params.toString();
  return `${API_BASE}${path}${search ? `?${search}` : ''}`;
};

const buildHeaders = (accept: string, hasBody: boolean): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: accept,
    Authorization: `tma ${getAuthPayload()}`,
  };
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

const isErrorBody = (value: unknown): value is ApiErrorBody => {
  return (
    typeof value === 'object' && value !== null && typeof (value as ApiErrorBody).error === 'string'
  );
};

const throwResponseError = async (response: Response): Promise<never> => {
  const data = await readJson(response);
  if (isErrorBody(data)) {
    throw new ApiError(response.status, data.error, data.message);
  }
  const code = response.status >= 500 ? API_ERROR_CODES.serverError : `http_${response.status}`;
  throw new ApiError(response.status, code);
};

const send = async (endpoint: RestEndpoint, accept: string, signal?: AbortSignal) => {
  const { path, method = 'GET', query, body } = endpoint;
  const response = await sendRequest(buildUrl(path, query), {
    method,
    headers: buildHeaders(accept, body !== undefined),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    await throwResponseError(response);
  }
  return response;
};

export const restTransport: ApiTransport = {
  request: async <T>(endpoint: { rest: RestEndpoint }, signal?: AbortSignal) => {
    const response = await send(endpoint.rest, 'application/json', signal);
    return (await readJson(response)) as T;
  },
};

/** Файлы (print.svg / print.png) — тоже с заголовком авторизации, поэтому через fetch, а не ссылкой */
export const requestRestBlob = async (path: string): Promise<Blob> => {
  const response = await send({ path }, '*/*');
  return response.blob();
};
