import { describe, expect, it } from 'vitest';

import { checkPngChunk, crc32, setPngDpi } from './pngDpi';

const encode = (text: string) => new TextEncoder().encode(text);

/** Минимальный «PNG»: сигнатура + IHDR + пустой IDAT — для проверки вставки чанка хватает */
const createPngBytes = (): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(8 + 25 + 12);
  const view = new DataView(bytes.buffer);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  view.setUint32(8, 13);
  bytes.set(encode('IHDR'), 12);
  view.setUint32(33, 0);
  bytes.set(encode('IDAT'), 37);
  return bytes;
};

describe('pngDpi', () => {
  it('crc32 matches the reference value', () => {
    expect(crc32(encode('123456789'))).toBe(0xcbf43926);
  });

  it('adds pHYs chunk with 300 dpi right after IHDR', async () => {
    const png = new Blob([createPngBytes()], { type: 'image/png' });
    const bytes = new Uint8Array(await (await setPngDpi(png, 300)).arrayBuffer());

    expect(checkPngChunk(bytes, 'pHYs')).toBe(true);
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.subarray(37, 41))).toBe('pHYs');
    expect(view.getUint32(41)).toBe(Math.round(300 / 0.0254));
    expect(bytes[49]).toBe(1);
  });

  it('keeps PNG untouched when pHYs already exists', async () => {
    const png = new Blob([createPngBytes()], { type: 'image/png' });
    const withDpi = await setPngDpi(png, 300);
    expect(await setPngDpi(withDpi, 300)).toBe(withDpi);
  });
});
