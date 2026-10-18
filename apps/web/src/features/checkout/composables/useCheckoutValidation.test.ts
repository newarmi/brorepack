import { reactive } from 'vue';

import type { CreateOrderInput } from '@brorepack/shared';
import { describe, expect, it } from 'vitest';

import { useCheckoutValidation } from './useCheckoutValidation';

const createInput = (): CreateOrderInput => {
  return {
    nickname: 'goodlifeee',
    design: { templateId: 'graphite', size: 'A5', displayName: 'goodlifeee' },
    extras: { lightStand: false },
    delivery: { method: 'cdek_pvz', city: '', address: '', location: null },
    recipient: { name: 'Иван', phone: '+79000000000' },
  };
};

describe('useCheckoutValidation', () => {
  it('hides errors until field is touched', () => {
    const input = reactive(createInput());
    const validation = useCheckoutValidation(() => input);
    expect(validation.result.value.success).toBe(false);
    expect(validation.errorFor('delivery.address')).toBeNull();

    validation.touch('delivery.address');
    expect(validation.errorFor('delivery.address')).toBe('Укажи адрес или пункт выдачи');
  });

  it('shows all errors after submit attempt', () => {
    const input = reactive(createInput());
    input.recipient.phone = '123';
    const validation = useCheckoutValidation(() => input);
    validation.isSubmitAttempted.value = true;
    expect(validation.errorFor('recipient.phone')).toBe('Проверь номер телефона');
    expect(validation.firstIssueMessage()).toBe('Укажи адрес или пункт выдачи');
  });

  it('reacts to input changes', () => {
    const input = reactive(createInput());
    const validation = useCheckoutValidation(() => input);
    // Адрес, введённый вручную: без города и координат
    input.delivery.address = 'Казань, Баумана, 1';
    expect(validation.result.value.success).toBe(true);
    expect(validation.firstIssueMessage()).toBeNull();
  });

  it('rejects coordinates out of range', () => {
    const input = reactive(createInput());
    input.delivery = {
      method: 'courier',
      city: 'Москва',
      address: 'Тверская, 7',
      location: { lat: 200, lon: 37.6 },
    };
    const validation = useCheckoutValidation(() => input);
    validation.isSubmitAttempted.value = true;
    expect(validation.result.value.success).toBe(false);
    expect(validation.errorFor('delivery.location.lat')).not.toBeNull();
  });
});
