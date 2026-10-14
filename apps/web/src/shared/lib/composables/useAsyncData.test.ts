import { nextTick, shallowRef } from 'vue';

import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/shared/api/errors';
import { withSetup } from '@/shared/testing/withSetup';

import { useAsyncData } from './useAsyncData';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve));

describe('useAsyncData', () => {
  it('loads immediately and becomes ready', async () => {
    const { result } = withSetup(() => useAsyncData(async () => 'data'));
    expect(result.status.value).toBe('loading');
    await flushPromises();
    expect(result.status.value).toBe('ready');
    expect(result.data.value).toBe('data');
  });

  it('turns any failure into ApiError', async () => {
    const { result } = withSetup(() =>
      useAsyncData(async () => {
        throw new Error('boom');
      }),
    );
    await flushPromises();
    expect(result.status.value).toBe('error');
    expect(result.error.value).toBeInstanceOf(ApiError);
    expect(result.error.value?.code).toBe('unknown');
  });

  it('reloads on source change and aborts the stale request', async () => {
    const id = shallowRef(1);
    const signals: AbortSignal[] = [];
    const loader = vi.fn(async (signal: AbortSignal) => {
      signals.push(signal);
      return id.value;
    });
    const { result } = withSetup(() => useAsyncData(loader, [id]));

    id.value = 2;
    await nextTick();
    await flushPromises();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(result.data.value).toBe(2);
  });

  it('refresh updates data silently and recovers after an error', async () => {
    let shouldFail = true;
    const { result } = withSetup(() =>
      useAsyncData(async () => {
        if (shouldFail) {
          throw new ApiError(500, 'server_error');
        }
        return 'fresh';
      }),
    );
    await flushPromises();
    expect(result.status.value).toBe('error');

    shouldFail = false;
    await result.refresh();
    expect(result.status.value).toBe('ready');
    expect(result.error.value).toBeNull();
    expect(result.data.value).toBe('fresh');
  });

  it('aborts the request when the component unmounts', async () => {
    const signals: AbortSignal[] = [];
    const { wrapper } = withSetup(() =>
      useAsyncData((signal) => {
        signals.push(signal);
        return new Promise(() => {});
      }),
    );
    wrapper.unmount();
    expect(signals[0]?.aborted).toBe(true);
  });
});
