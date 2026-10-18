import { createPinia, setActivePinia } from 'pinia';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCustomImageStore } from './customImageStore';
import { useDraftStore } from './draftStore';

const PLACEMENT_KEY = 'brorepack:custom-image:v1';
const placement = { width: 200, height: 100, transform: { x: 10, y: 20, scale: 2, rotation: 0 } };

describe('custom image store', () => {
  let revokeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:image');
    revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('отдаёт картинку для плашки и сохраняет положение отдельно от черновика', async () => {
    const store = useCustomImageStore();
    store.setImage(new Blob(['x']), placement);
    store.setTransform({ x: 50, y: 60, scale: 1, rotation: 30 });

    expect(store.image).toEqual({
      href: 'blob:image',
      width: 200,
      height: 100,
      x: 50,
      y: 60,
      scale: 1,
      rotation: 30,
    });
    await Promise.resolve();
    expect(JSON.parse(sessionStorage.getItem(PLACEMENT_KEY) ?? 'null')).toMatchObject({
      transform: { x: 50, rotation: 30 },
    });
  });

  it('без файла в IndexedDB забывает положение после перезагрузки', async () => {
    sessionStorage.setItem(PLACEMENT_KEY, JSON.stringify(placement));
    const store = useCustomImageStore();
    expect(store.image).toBeNull();
    await vi.waitFor(() => expect(sessionStorage.getItem(PLACEMENT_KEY)).toBeNull());
  });

  it('сброс черновика после заказа удаляет картинку', () => {
    const store = useCustomImageStore();
    store.setImage(new Blob(['x']), placement);
    useDraftStore().reset();
    expect(store.image).toBeNull();
    expect(revokeSpy).toHaveBeenCalledWith('blob:image');
  });
});
