import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createOrderFixture, createProfileFixture } from '@/shared/testing/fixtures';

const fetchMe = vi.fn();

vi.mock('@/entities/session/api', () => {
  return { fetchMe };
});

// Экраны в тестах роутера не нужны — подменяем пустым компонентом
vi.mock('@/pages/StartPage.vue', () => ({ default: { render: () => null } }));
vi.mock('@/pages/NicknamePage.vue', () => ({ default: { render: () => null } }));
vi.mock('@/pages/ProfilePage.vue', () => ({ default: { render: () => null } }));
vi.mock('@/pages/ConstructorPage.vue', () => ({ default: { render: () => null } }));
vi.mock('@/pages/CheckoutPage.vue', () => ({ default: { render: () => null } }));
vi.mock('@/pages/MyOrdersPage.vue', () => ({ default: { render: () => null } }));
vi.mock('@/pages/OrderPage.vue', () => ({ default: { render: () => null } }));
vi.mock('@/pages/AdminOrdersPage.vue', () => ({ default: { render: () => null } }));
vi.mock('@/pages/AdminOrderPage.vue', () => ({ default: { render: () => null } }));

const loadRouter = async (startParam?: string) => {
  vi.resetModules();
  if (startParam) {
    vi.stubGlobal('Telegram', {
      WebApp: {
        initData: 'signed',
        initDataUnsafe: { start_param: startParam },
        isVersionAtLeast: () => false,
      },
    });
  }
  const { createPinia, setActivePinia } = await import('pinia');
  setActivePinia(createPinia());
  const { router } = await import('./index');
  const { goBack } = await import('./goBack');
  const { useDraftStore } = await import('@/entities/draft/store');
  return { router, goBack, useDraftStore };
};

describe('router', () => {
  beforeEach(() => {
    window.location.hash = '';
    sessionStorage.clear();
    fetchMe.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens order from start_param deep link', async () => {
    const { router } = await loadRouter('order_15');
    await router.push('/');
    expect(router.currentRoute.value.name).toBe('order');
    expect(router.currentRoute.value.params.id).toBe('15');
  });

  it('opens admin from start_param deep link', async () => {
    fetchMe.mockResolvedValue({ user: { id: 1, firstName: 'A', username: null }, isAdmin: true });
    const { router } = await loadRouter('admin');
    await router.push('/');
    expect(router.currentRoute.value.name).toBe('admin');
  });

  it('redirects to start when profile is required but missing', async () => {
    const { router, useDraftStore } = await loadRouter();
    await router.push('/constructor');
    expect(router.currentRoute.value.name).toBe('start');

    useDraftStore().setProfile(createProfileFixture());
    await router.push('/constructor');
    expect(router.currentRoute.value.name).toBe('constructor');
  });

  it('lets only admins into admin pages', async () => {
    fetchMe.mockResolvedValue({ user: { id: 2, firstName: 'B', username: null }, isAdmin: false });
    const { router } = await loadRouter();
    await router.push('/admin/orders/5');
    expect(router.currentRoute.value.name).toBe('start');
  });

  it('goBack goes to parent screen when app history is empty', async () => {
    const { router, goBack } = await loadRouter();
    await router.push({ name: 'order', params: { id: createOrderFixture().id } });
    window.history.replaceState({ ...window.history.state, back: null }, '');

    goBack(router);
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'));
  });

  it('unknown path redirects to start', async () => {
    const { router } = await loadRouter();
    await router.push('/nope');
    expect(router.currentRoute.value.name).toBe('start');
  });
});
