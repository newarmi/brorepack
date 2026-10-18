import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GlitchText from './GlitchText.vue';

describe('GlitchText', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the whole text for screen readers and turns each digit reel to its digit', () => {
    const wrapper = mount(GlitchText, { props: { text: '390 ₽' } });

    expect(wrapper.get('.visually-hidden').text()).toBe('390 ₽');
    const reels = wrapper.findAll('.glitch-text__reel');
    expect(reels.map((reel) => reel.attributes('style'))).toEqual([
      'transform: translateY(-30%);',
      'transform: translateY(-90%);',
      'transform: translateY(0%);',
    ]);
  });

  it('glitches for a moment when the value changes', async () => {
    const wrapper = mount(GlitchText, { props: { text: '390 ₽' } });

    await wrapper.setProps({ text: '590 ₽' });
    vi.advanceTimersToNextFrame();
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('glitch-text--glitch');

    await vi.advanceTimersByTimeAsync(400);
    expect(wrapper.classes()).not.toContain('glitch-text--glitch');
  });

  it('scrambles changed letters with glyphs and reveals the new label', async () => {
    const wrapper = mount(GlitchText, { props: { text: 'Далее 3 470 ₽' } });
    const getVisibleText = () => wrapper.get('.glitch-text__chars').text();

    await wrapper.setProps({ text: 'Оплатить 3 470 ₽' });
    expect(getVisibleText()).toMatch(/[█▓▒░<>/\\|#*+=_]/);
    // Пока буквы перебирают глифы, экранный диктор уже читает новую надпись
    expect(wrapper.get('.visually-hidden').text()).toBe('Оплатить 3 470 ₽');

    await vi.advanceTimersByTimeAsync(600);
    expect(getVisibleText()).toMatch(/^Оплатить/);
  });

  it('keeps letters in place when only the amount changes', async () => {
    const wrapper = mount(GlitchText, { props: { text: 'Оплатить 990 ₽' } });

    await wrapper.setProps({ text: 'Оплатить 1 080 ₽' });

    expect(wrapper.get('.glitch-text__chars').text()).toMatch(/^Оплатить/);
  });
});
