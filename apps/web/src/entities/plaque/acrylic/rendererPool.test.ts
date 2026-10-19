import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PooledRenderer, RendererOptions } from './rendererPool';
import { createRendererPool } from './rendererPool';

const OPTIONS: RendererOptions = { isAntialias: true, isWebGLForced: false };

const createFakeRenderer = () => {
  const dispose = vi.fn(() => Promise.resolve());
  const pooled = { renderer: { dispose }, isWebGPU: true } as unknown as PooledRenderer;
  return { pooled, dispose };
};

describe('createRendererPool', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shares one renderer between users', async () => {
    const fake = createFakeRenderer();
    const factory = vi.fn(() => Promise.resolve(fake.pooled));
    const pool = createRendererPool(factory, 5000);

    const [first, second] = await Promise.all([pool.acquire(OPTIONS), pool.acquire(OPTIONS)]);

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledOnce();
  });

  it('frees the renderer only after the last user and a delay', async () => {
    const fake = createFakeRenderer();
    const pool = createRendererPool(() => Promise.resolve(fake.pooled), 5000);
    await pool.acquire(OPTIONS);
    await pool.acquire(OPTIONS);

    pool.release();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fake.dispose).not.toHaveBeenCalled();

    pool.release();
    await vi.advanceTimersByTimeAsync(4000);
    expect(fake.dispose).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fake.dispose).toHaveBeenCalledOnce();
  });

  it('reuses the renderer when the next screen comes before the delay ends', async () => {
    const fake = createFakeRenderer();
    const factory = vi.fn(() => Promise.resolve(fake.pooled));
    const pool = createRendererPool(factory, 5000);
    await pool.acquire(OPTIONS);
    pool.release();

    await vi.advanceTimersByTimeAsync(1000);
    await pool.acquire(OPTIONS);
    await vi.advanceTimersByTimeAsync(10_000);

    expect(factory).toHaveBeenCalledOnce();
    expect(fake.dispose).not.toHaveBeenCalled();
  });

  it('does not cache a failed renderer', async () => {
    const fake = createFakeRenderer();
    const factory = vi
      .fn<() => Promise<PooledRenderer>>()
      .mockRejectedValueOnce(new Error('Нет WebGL 2'))
      .mockResolvedValueOnce(fake.pooled);
    const pool = createRendererPool(factory, 5000);

    await expect(pool.acquire(OPTIONS)).rejects.toThrow();
    pool.release();
    await expect(pool.acquire(OPTIONS)).resolves.toBe(fake.pooled);
  });
});
