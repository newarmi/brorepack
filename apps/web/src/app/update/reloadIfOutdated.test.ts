import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reloadIfOutdated } from './reloadIfOutdated';

const createJsonResponse = (body: unknown): Response => new Response(JSON.stringify(body));

const createReplaceMock = () => vi.fn<(url: string | URL) => void>();

vi.mock('@/shared/config', () => ({ BUILD_ID: 'old', IS_PRODUCTION_BUILD: true }));

describe('reloadIfOutdated', () => {
  let replace: ReturnType<typeof createReplaceMock>;

  beforeEach(() => {
    sessionStorage.clear();
    replace = createReplaceMock();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      href: 'https://newarmi.github.io/brorepack/#/checkout',
      replace,
    } as unknown as Location);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the fresh build by a new address and keeps the route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({ buildId: 'new' })));

    await reloadIfOutdated();

    expect(replace).toHaveBeenCalledWith('https://newarmi.github.io/brorepack/?v=new#/checkout');
  });

  it('stays when the build is current', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({ buildId: 'old' })));

    await reloadIfOutdated();

    expect(replace).not.toHaveBeenCalled();
  });

  // Если и по новому адресу пришла старая страница, перезагрузка не должна повторяться бесконечно
  it('reloads only once for the same fresh build', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({ buildId: 'new' })));

    await reloadIfOutdated();
    await reloadIfOutdated();

    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('stays offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await reloadIfOutdated();

    expect(replace).not.toHaveBeenCalled();
  });
});
