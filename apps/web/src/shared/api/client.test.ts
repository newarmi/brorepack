import { afterEach, describe, expect, it, vi } from 'vitest';

import { createJsonResponse } from '@/shared/testing/fixtures';

const endpoint = {
  rest: { path: '/orders', method: 'POST' as const, body: { a: 1 }, query: { status: 'paid' } },
  gas: { action: 'orders.create', params: { a: 1 } },
};

const loadClient = async (transport: 'rest' | 'gas') => {
  vi.resetModules();
  vi.stubEnv('VITE_API_TRANSPORT', transport);
  vi.stubEnv('VITE_GAS_URL', 'https://gas.example/exec');
  const client = await import('./client');
  const errors = await import('./errors');
  return { ...client, ...errors };
};

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('REST: sends JSON with dev authorization and query', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    const { call } = await loadClient('rest');

    await expect(call(endpoint)).resolves.toEqual({ ok: 1 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/orders?status=paid');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>).Authorization).toBe('tma dev:1');
  });

  it('REST: maps error body to ApiError with server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createJsonResponse({ error: 'not_found', message: 'Нет' }, 404)),
    );
    const { call, ApiError } = await loadClient('rest');

    const error = await call(endpoint).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'not_found', message: 'Нет' });
  });

  it('REST: falls back to known text when server sent no message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createJsonResponse({ error: 'forbidden' }, 403)),
    );
    const { call } = await loadClient('rest');
    await expect(call(endpoint)).rejects.toMatchObject({
      code: 'forbidden',
      message: 'Нет доступа',
    });
  });

  it('REST: unknown 5xx becomes server_error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 502 })));
    const { call } = await loadClient('rest');
    await expect(call(endpoint)).rejects.toMatchObject({ status: 502, code: 'server_error' });
  });

  it('network failure becomes network_error, abort is rethrown as is', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { call, isAbortError } = await loadClient('rest');
    await expect(call(endpoint)).rejects.toMatchObject({ status: 0, code: 'network_error' });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    const error = await call(endpoint).catch((caught: unknown) => caught);
    expect(isAbortError(error)).toBe(true);
  });

  it('GAS: posts action, auth and params as text/plain and unwraps envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ ok: true, data: { id: 5 } }));
    vi.stubGlobal('fetch', fetchMock);
    const { call } = await loadClient('gas');

    await expect(call(endpoint)).resolves.toEqual({ id: 5 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://gas.example/exec');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'text/plain;charset=utf-8',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      action: 'orders.create',
      auth: 'dev:1',
      params: { a: 1 },
    });
  });

  it('GAS: error envelope becomes ApiError, garbage becomes server_error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createJsonResponse({ ok: false, status: 403, error: 'forbidden' })),
    );
    const { call } = await loadClient('gas');
    await expect(call(endpoint)).rejects.toMatchObject({ status: 403, code: 'forbidden' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>')));
    await expect(call(endpoint)).rejects.toMatchObject({ code: 'server_error' });
  });
});
