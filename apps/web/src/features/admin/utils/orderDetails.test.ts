import { describe, expect, it } from 'vitest';

import { createOrderFixture } from '@/shared/testing';

import {
  getCustomerDetails,
  getDeliveryDetails,
  getDesignDetails,
  getRecipientDetails,
} from './orderDetails';

const getLabels = (items: { label: string }[]) => items.map((item) => item.label);

describe('orderDetails', () => {
  it('design details include comment only when present', () => {
    expect(getLabels(getDesignDetails(createOrderFixture()))).not.toContain('Пожелания');
    const withComment = getDesignDetails(createOrderFixture({ comment: 'дракон' }));
    expect(withComment.at(-1)).toEqual({ label: 'Пожелания', value: 'дракон', selectable: true });
  });

  it('delivery details include tracking number only when present', () => {
    expect(getLabels(getDeliveryDetails(createOrderFixture()))).toEqual([
      'Способ',
      'Город',
      'Адрес',
      'Координаты',
    ]);
    const manual = createOrderFixture({
      delivery: { method: 'courier', city: '', address: 'Казань, Баумана, 1', location: null },
    });
    expect(getDeliveryDetails(manual).slice(1)).toEqual([
      { label: 'Адрес', value: 'Казань, Баумана, 1', selectable: true },
      { label: 'Координаты', value: 'нет — адрес введён вручную' },
    ]);
    const shipped = getDeliveryDetails(createOrderFixture({ trackingNumber: 'CDEK1' }));
    expect(shipped.at(-1)).toMatchObject({ label: 'Трек-номер', value: 'CDEK1' });
  });

  it('customer details include paid date only when paid', () => {
    expect(getLabels(getCustomerDetails(createOrderFixture()))).toEqual([
      'Имя',
      'Telegram id',
      'Создан',
    ]);
    const paid = getCustomerDetails(createOrderFixture({ paidAt: '2026-10-13T15:00:00.000Z' }));
    expect(getLabels(paid)).toContain('Оплачен');
  });

  it('recipient details', () => {
    expect(getRecipientDetails(createOrderFixture())).toEqual([
      { label: 'Имя', value: 'Иван Иванов', selectable: true },
      { label: 'Телефон', value: '+79000000000', selectable: true },
    ]);
  });
});
