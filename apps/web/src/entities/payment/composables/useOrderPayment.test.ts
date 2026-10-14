import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createOrderFixture, withSetup } from '@/shared/testing';

const fetchOrder = vi.fn();
const mockPayOrder = vi.fn();

vi.mock('@/entities/order/api/orders', () => {
  return { fetchOrder, mockPayOrder };
});

const loadPayment = async () => {
  vi.resetModules();
  const { useOrderPayment } = await import('./useOrderPayment');
  return withSetup(() => useOrderPayment()).result;
};

const stubTelegram = (invoiceStatus: string) => {
  vi.stubGlobal('Telegram', {
    WebApp: {
      initData: 'signed',
      initDataUnsafe: {},
      isVersionAtLeast: () => true,
      openInvoice: (_url: string, callback: (status: string) => void) => callback(invoiceStatus),
      HapticFeedback: {},
    },
  });
};

describe('useOrderPayment', () => {
  beforeEach(() => {
    fetchOrder.mockReset();
    mockPayOrder.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('mock mode: opens sheet and resolves paid after confirm', async () => {
    const payment = await loadPayment();
    const order = createOrderFixture();
    const paidOrder = createOrderFixture({ status: 'paid' });
    mockPayOrder.mockResolvedValue(paidOrder);

    const outcomePromise = payment.pay(order, { invoiceUrl: null, paymentMode: 'mock' });
    expect(payment.isMockSheetOpen.value).toBe(true);
    expect(payment.mockOrder.value).toEqual(order);

    await payment.confirmMockPayment();
    await expect(outcomePromise).resolves.toEqual({ status: 'paid', order: paidOrder });
    expect(payment.isMockSheetOpen.value).toBe(false);
  });

  it('mock mode: closing the sheet cancels payment', async () => {
    const payment = await loadPayment();
    const outcomePromise = payment.pay(createOrderFixture(), {
      invoiceUrl: null,
      paymentMode: 'mock',
    });
    payment.isMockSheetOpen.value = false;
    await expect(outcomePromise).resolves.toEqual({ status: 'cancelled' });
  });

  it('fails without invoice url and is unavailable outside Telegram', async () => {
    const payment = await loadPayment();
    const order = createOrderFixture();
    await expect(
      payment.pay(order, { invoiceUrl: null, paymentMode: 'telegram' }),
    ).resolves.toEqual({ status: 'failed' });
    await expect(
      payment.pay(order, { invoiceUrl: 'https://t.me/invoice', paymentMode: 'telegram' }),
    ).resolves.toEqual({ status: 'unavailable' });
  });

  it('Telegram: waits until bot marks the order paid', async () => {
    stubTelegram('paid');
    vi.useFakeTimers();
    const payment = await loadPayment();
    const paidOrder = createOrderFixture({ status: 'paid' });
    fetchOrder.mockResolvedValueOnce(createOrderFixture()).mockResolvedValueOnce(paidOrder);

    const outcomePromise = payment.pay(createOrderFixture(), {
      invoiceUrl: 'https://t.me/invoice',
      paymentMode: 'telegram',
    });
    await vi.advanceTimersByTimeAsync(3000);

    await expect(outcomePromise).resolves.toEqual({ status: 'paid', order: paidOrder });
    expect(fetchOrder).toHaveBeenCalledTimes(2);
    expect(payment.isConfirming.value).toBe(false);
  });

  it('Telegram: passes through cancelled invoice', async () => {
    stubTelegram('cancelled');
    const payment = await loadPayment();
    await expect(
      payment.pay(createOrderFixture(), {
        invoiceUrl: 'https://t.me/invoice',
        paymentMode: 'telegram',
      }),
    ).resolves.toEqual({ status: 'cancelled' });
  });
});
