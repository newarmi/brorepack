import { describe, expect, it } from 'vitest';

import { createOrderFixture } from '@/shared/testing/fixtures';

import { formatDesignSummary, formatPlaqueTitle } from './format';

describe('plaque format', () => {
  it('formats plaque title and design summary', () => {
    const { design } = createOrderFixture();
    expect(formatPlaqueTitle(design)).toBe('Плашка «Blue Ninja»');
    expect(formatDesignSummary(design)).toBe('A5 · goodlifeee · 9 lvl');
  });
});
