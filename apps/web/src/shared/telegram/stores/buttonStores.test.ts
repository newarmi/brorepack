import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBackButtonStore } from './backButtonStore';
import { useMainButtonStore } from './mainButtonStore';

describe('Telegram button stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('back button: last pushed handler wins, default handler is the fallback', () => {
    const backButton = useBackButtonStore();
    const defaultHandler = vi.fn();
    const sheetHandler = vi.fn();
    const sheetOwner = Symbol('sheet');
    backButton.setDefaultHandler(defaultHandler);

    expect(backButton.isVisible).toBe(false);
    backButton.pushHandler(sheetOwner, sheetHandler);
    expect(backButton.isVisible).toBe(true);

    backButton.click();
    expect(sheetHandler).toHaveBeenCalledOnce();

    backButton.removeHandler(sheetOwner);
    backButton.click();
    expect(defaultHandler).toHaveBeenCalledOnce();
  });

  it('main button: only the owner can update or release it, clicks respect disabled state', () => {
    const mainButton = useMainButtonStore();
    const handler = vi.fn();
    const owner = Symbol('screen');
    const stranger = Symbol('stranger');
    const visibleState = { text: 'Оплатить', visible: true, disabled: false, loading: false };

    mainButton.claim(owner, handler);
    mainButton.update(stranger, { ...visibleState, text: 'Чужая' });
    expect(mainButton.state.visible).toBe(false);

    mainButton.update(owner, visibleState);
    mainButton.click();
    expect(handler).toHaveBeenCalledOnce();

    mainButton.update(owner, { ...visibleState, loading: true });
    mainButton.click();
    expect(handler).toHaveBeenCalledOnce();

    mainButton.release(stranger);
    expect(mainButton.state.visible).toBe(true);
    mainButton.release(owner);
    expect(mainButton.state.visible).toBe(false);
  });
});
