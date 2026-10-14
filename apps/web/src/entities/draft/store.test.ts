import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import { createProfileFixture } from '@/shared/testing/fixtures';

import { useDraftStore } from './store';

const STORAGE_KEY = 'brorepack:draft:v2';

describe('draft store', () => {
  beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
  });

  it('starts with defaults when storage is empty', () => {
    const draft = useDraftStore();
    expect(draft.templateId).toBe('blue');
    expect(draft.delivery.method).toBe('cdek_pvz');
    expect(draft.hasProfile).toBe(false);
    expect(draft.pendingOrderId).toBeNull();
  });

  it('restores state from sessionStorage and drops unknown enum values', () => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        templateId: 'unknown',
        displayName: 'saved',
        delivery: { method: 'teleport', city: 'Казань' },
        recipient: { name: 'Пётр' },
      }),
    );
    const draft = useDraftStore();
    expect(draft.templateId).toBe('blue');
    expect(draft.displayName).toBe('saved');
    expect(draft.delivery).toEqual({ method: 'cdek_pvz', city: 'Казань', address: '' });
    expect(draft.recipient).toEqual({ name: 'Пётр', phone: '' });
  });

  it('falls back to defaults on broken JSON', () => {
    sessionStorage.setItem(STORAGE_KEY, '{broken');
    expect(useDraftStore().templateId).toBe('blue');
  });

  it('persists changes to sessionStorage', async () => {
    const draft = useDraftStore();
    draft.displayName = 'новая';
    await nextTick();
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}').displayName).toBe('новая');
  });

  it('setProfile fills nickname and displayName, keeps custom name for the same player', () => {
    const draft = useDraftStore();
    draft.setProfile(createProfileFixture());
    expect(draft.nickname).toBe('goodlifeee');
    expect(draft.displayName).toBe('goodlifeee');

    draft.displayName = 'Свой текст';
    draft.setProfile(createProfileFixture());
    expect(draft.displayName).toBe('Свой текст');

    draft.setProfile(createProfileFixture({ playerId: 'player-2', nickname: 'other' }));
    expect(draft.displayName).toBe('other');
  });

  it('builds design from FACEIT profile', () => {
    const draft = useDraftStore();
    draft.setProfile(createProfileFixture());
    expect(draft.design).toEqual({
      templateId: 'blue',
      size: 'A5',
      displayName: 'goodlifeee',
      caption: 'for reaching 9 lvl · 1809 elo',
      level: 9,
      elo: 1809,
    });
  });

  it('builds order input, comment only for custom template', () => {
    const draft = useDraftStore();
    draft.setProfile(createProfileFixture());
    draft.comment = '  хочу дракона  ';
    expect(draft.orderInput.comment).toBeUndefined();

    draft.templateId = 'custom';
    expect(draft.orderInput).toMatchObject({
      nickname: 'goodlifeee',
      design: { templateId: 'custom', size: 'A5', displayName: 'goodlifeee' },
      extras: { lightStand: false },
      comment: 'хочу дракона',
    });
  });

  it('calculates plaque and order prices', () => {
    const draft = useDraftStore();
    draft.lightStand = true;
    expect(draft.plaquePrice.total).toBe(2490 + 590);
    expect(draft.orderPrice.total).toBe(2490 + 590 + 390);
  });

  it('pendingOrderId is valid only while draft is unchanged', () => {
    const draft = useDraftStore();
    draft.setProfile(createProfileFixture());
    draft.rememberPendingOrder(7);
    expect(draft.pendingOrderId).toBe(7);

    draft.displayName = 'изменил';
    expect(draft.pendingOrderId).toBeNull();
  });

  it('reset restores defaults', () => {
    const draft = useDraftStore();
    draft.setProfile(createProfileFixture());
    draft.reset();
    expect(draft.hasProfile).toBe(false);
    expect(draft.nickname).toBe('');
  });
});
