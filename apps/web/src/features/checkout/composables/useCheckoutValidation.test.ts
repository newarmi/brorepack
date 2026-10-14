import { reactive } from 'vue';

import type { CreateOrderInput } from '@brorepack/shared';
import { describe, expect, it } from 'vitest';

import { useCheckoutValidation } from './useCheckoutValidation';

const createInput = (): CreateOrderInput => {
  return {
    nickname: 'goodlifeee',
    design: { templateId: 'blue', size: 'A5', displayName: 'goodlifeee' },
    extras: { lightStand: false },
    delivery: { method: 'cdek_pvz', city: '', address: 'Тверская, 7' },
    recipient: { name: 'Иван', phone: '+79000000000' },
  };
};

describe('useCheckoutValidation', () => {
  it('hides errors until field is touched', () => {
    const input = reactive(createInput());
    const validation = useCheckoutValidation(() => input);
    expect(validation.result.value.success).toBe(false);
    expect(validation.errorFor('delivery.city')).toBeNull();

    validation.touch('delivery.city');
    expect(validation.errorFor('delivery.city')).toBe('Укажи город');
  });

  it('shows all errors after submit attempt', () => {
    const input = reactive(createInput());
    input.recipient.phone = '123';
    const validation = useCheckoutValidation(() => input);
    validation.isSubmitAttempted.value = true;
    expect(validation.errorFor('recipient.phone')).toBe('Проверь номер телефона');
    expect(validation.firstIssueMessage()).toBe('Укажи город');
  });

  it('reacts to input changes', () => {
    const input = reactive(createInput());
    const validation = useCheckoutValidation(() => input);
    input.delivery.city = 'Москва';
    expect(validation.result.value.success).toBe(true);
    expect(validation.firstIssueMessage()).toBeNull();
  });
});
