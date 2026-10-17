import { describe, expect, it } from 'vitest';

import { createOrderFixture } from '@/shared/testing';

import { formatDesignSummary, formatPlaqueTitle } from './format';

describe('plaque format', () => {
  it('formats plaque title and design summary', () => {
    const { design } = createOrderFixture();
    expect(formatPlaqueTitle(design)).toBe('Плашка «Graphite»');
    expect(formatDesignSummary(design)).toBe('A5 · goodlifeee · 9 lvl');
  });
});
