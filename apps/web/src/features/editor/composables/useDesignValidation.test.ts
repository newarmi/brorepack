import { createPinia, setActivePinia } from 'pinia';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCustomImageStore, useDraftStore } from '@/entities/draft';
import { CUSTOM_TEMPLATE_ID } from '@/entities/plaque';

import { useDesignValidation } from './useDesignValidation';

const placement = { width: 200, height: 100, transform: { x: 10, y: 20, scale: 2, rotation: 0 } };

describe('useDesignValidation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    setActivePinia(createPinia());
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:image');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not let a custom design through without an image', () => {
    const draft = useDraftStore();
    draft.displayName = 'player';
    draft.templateId = CUSTOM_TEMPLATE_ID;
    const { isDesignValid } = useDesignValidation();

    expect(isDesignValid.value).toBe(false);

    useCustomImageStore().setImage(new Blob(['x']), placement);
    expect(isDesignValid.value).toBe(true);
  });

  it('does not need an image for a ready template', () => {
    const draft = useDraftStore();
    draft.displayName = 'player';
    draft.templateId = 'graphite';
    const { isDesignValid } = useDesignValidation();

    expect(isDesignValid.value).toBe(true);
  });
});
