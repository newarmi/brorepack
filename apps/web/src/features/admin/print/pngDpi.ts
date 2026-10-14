// canvas.toBlob не пишет DPI — добавляем чанк pHYs, иначе типография увидит 72 dpi.
// Формат чанков PNG: 4 байта длины + 4 байта типа + данные + 4 байта CRC32

const PNG_SIGNATURE_LENGTH = 8;
// 8 байт сигнатуры + IHDR (4 длина + 4 тип + 13 данных + 4 CRC) — pHYs идёт сразу после него
const IHDR_END = 33;
const METERS_PER_INCH = 0.0254;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export const crc32 = (data: Uint8Array): number => {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

/** Есть ли в PNG чанк `type` до начала данных изображения (IDAT) */
export const checkPngChunk = (bytes: Uint8Array, type: string): boolean => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = PNG_SIGNATURE_LENGTH;
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const chunkType = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (chunkType === type) {
      return true;
    }
    if (chunkType === 'IDAT') {
      return false;
    }
    offset += 12 + length;
  }
  return false;
};

/** Чанк pHYs: одинаковое разрешение по X и Y, единица — метр */
const createPhysChunk = (dpi: number): Uint8Array<ArrayBuffer> => {
  const pixelsPerMeter = Math.round(dpi / METERS_PER_INCH);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4);
  view.setUint32(8, pixelsPerMeter);
  view.setUint32(12, pixelsPerMeter);
  chunk[16] = 1;
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  return chunk;
};

export const setPngDpi = async (png: Blob, dpi: number): Promise<Blob> => {
  const bytes = new Uint8Array(await png.arrayBuffer());
  if (checkPngChunk(bytes, 'pHYs')) {
    return png;
  }
  return new Blob([bytes.subarray(0, IHDR_END), createPhysChunk(dpi), bytes.subarray(IHDR_END)], {
    type: 'image/png',
  });
};
