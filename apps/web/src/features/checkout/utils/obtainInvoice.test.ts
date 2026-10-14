import { createPinia, setActivePinia } from 'pinia';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDraftStore } from '@/entities/draft';
import { createOrderFixture, createProfileFixture } from '@/shared/testing';

import { obtainInvoice } from './obtainInvoice';

const api = vi.hoisted(() => {
  return { createOrder: vi.fn(), createOrderInvoice: vi.fn(), fetchOrder: vi.fn() };
});

vi.mock('@/entities/order/api/orders', () => api);

const mockInvoice = { invoiceUrl: null, paymentMode: 'mock' as const };

describe('obtainInvoice', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
    Object.values(api).forEach((mock) => mock.mockReset());
    useDraftStore().setProfile(createProfileFixture());
  });

  it('creates a new order and remembers it as pending', async () => {
    const order = createOrderFixture({ id: 7 });
    api.createOrder.mockResolvedValue({ order, ...mockInvoice });
    const draft = useDraftStore();

    const result = await obtainInvoice(draft.orderInput);

    expect(result).toEqual({ order, invoice: mockInvoice });
    expect(draft.pendingOrderId).toBe(7);
  });

  it('reuses the unpaid order from the same draft', async () => {
    const draft = useDraftStore();
    draft.rememberPendingOrder(7);
    const order = createOrderFixture({ id: 7 });
    api.fetchOrder.mockResolvedValue(order);
    api.createOrderInvoice.mockResolvedValue(mockInvoice);

    const result = await obtainInvoice(draft.orderInput);

    expect(result).toEqual({ order, invoice: mockInvoice });
    expect(api.createOrder).not.toHaveBeenCalled();
  });

  it('creates a new order when the pending one is already paid or unavailable', async () => {
    const draft = useDraftStore();
    draft.rememberPendingOrder(7);
    api.fetchOrder.mockResolvedValue(createOrderFixture({ id: 7, status: 'paid' }));
    api.createOrder.mockResolvedValue({ order: createOrderFixture({ id: 8 }), ...mockInvoice });

    await obtainInvoice(draft.orderInput);
    expect(api.createOrder).toHaveBeenCalledOnce();

    api.fetchOrder.mockRejectedValue(new Error('gone'));
    await obtainInvoice(draft.orderInput);
    expect(api.createOrder).toHaveBeenCalledTimes(2);
  });
});
