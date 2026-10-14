import type { OrderStatus } from '@brorepack/shared';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import OrderTimeline from './OrderTimeline.vue';

const mountTimeline = (
  status: OrderStatus,
  extra: { paidAt?: string | null; trackingNumber?: string | null } = {},
) => {
  return mount(OrderTimeline, {
    props: { order: { status, paidAt: null, trackingNumber: null, ...extra } },
  });
};

const readSteps = (status: OrderStatus, extra = {}) => {
  return mountTimeline(status, extra)
    .findAll('li')
    .map((item) => {
      const state = ['done', 'current', 'todo'].find((name) =>
        item.classes().includes(`order-timeline__step--${name}`),
      );
      return {
        label: item.find('.order-timeline__label').text(),
        state,
        note: item.find('.order-timeline__note').exists()
          ? item.find('.order-timeline__note').text()
          : null,
      };
    });
};

describe('OrderTimeline', () => {
  it('awaiting payment: first step is current and called «Ждёт оплаты»', () => {
    const steps = readSteps('awaiting_payment');
    expect(steps[0]).toEqual({
      label: 'Ждёт оплаты',
      state: 'current',
      note: 'после оплаты сразу начнём работу',
    });
    expect(steps.slice(1).map((step) => step.state)).toEqual(['todo', 'todo', 'todo']);
    expect(steps[2]?.note).toBe('здесь появится трек-номер СДЭК');
  });

  it('paid: printing is current with «скоро возьмём в печать»', () => {
    const steps = readSteps('paid', { paidAt: '2026-10-13T14:32:00.000Z' });
    expect(steps[0]).toMatchObject({ label: 'Оплачен', state: 'done' });
    expect(steps[0]?.note).not.toBeNull();
    expect(steps[1]).toEqual({
      label: 'В печати',
      state: 'current',
      note: 'скоро возьмём в печать',
    });
  });

  it('printing: note says 1–2 days', () => {
    expect(readSteps('printing')[1]?.note).toBe('обычно 1–2 дня');
  });

  it('shipped: shows tracking number on current step', () => {
    const steps = readSteps('shipped', { trackingNumber: 'CDEK1' });
    expect(steps[2]).toEqual({
      label: 'Отправлен',
      state: 'current',
      note: 'трек-номер СДЭК: CDEK1',
    });
  });

  it('delivered: all steps done', () => {
    expect(readSteps('delivered').map((step) => step.state)).toEqual([
      'done',
      'done',
      'done',
      'done',
    ]);
  });
});
