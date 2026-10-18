import { describe, expect, it } from 'vitest';

import { formatPhone } from './phoneMask';

describe('formatPhone', () => {
  it('formats Russian number as +7 (900) 123-45-67 whatever the start', () => {
    expect(formatPhone('89001234567')).toBe('+7 (900) 123-45-67');
    expect(formatPhone('9001234567')).toBe('+7 (900) 123-45-67');
    expect(formatPhone('+7 900 123 45 67')).toBe('+7 (900) 123-45-67');
  });

  it('adds separator only before the next digit and cuts extra digits', () => {
    expect(formatPhone('+7900')).toBe('+7 (900');
    expect(formatPhone('+79001')).toBe('+7 (900) 1');
    expect(formatPhone('+7900123456789')).toBe('+7 (900) 123-45-67');
  });

  it('keeps foreign number as +digits and empty input empty', () => {
    expect(formatPhone('+380 50 123 45 67')).toBe('+380501234567');
    expect(formatPhone('')).toBe('');
    expect(formatPhone('+')).toBe('+');
    expect(formatPhone('abc')).toBe('');
  });
});
