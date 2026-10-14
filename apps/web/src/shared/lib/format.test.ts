import { describe, expect, it } from 'vitest';

import { formatCountry, formatDay, formatNumber } from './format';

describe('format', () => {
  it('formats day without trailing dot and survives invalid dates', () => {
    expect(formatDay('2026-10-13T12:00:00.000Z')).toBe('13 окт');
    expect(formatDay('not a date')).toBe('');
  });

  it('formats numbers with narrow no-break space', () => {
    expect(formatNumber(1248)).toBe('1 248');
  });

  it('formats country code', () => {
    expect(formatCountry('ru')).toBe('Россия');
    expect(formatCountry(null)).toBeNull();
  });
});
