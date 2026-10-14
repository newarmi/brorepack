import type { PlaqueDesign } from '@brorepack/shared';
import { PLAQUE_PRINT_SIZE_MM, renderPlaqueSvg } from '@brorepack/shared';

import { loadEmbeddedFontCss } from './embeddedFonts';
import { setPngDpi } from './pngDpi';

// Файлы для типографии в браузере: нужны, когда бэкенд на Apps Script — он не умеет PNG.
// SVG тот же, что рендерит Node-сервер: renderPlaqueSvg в режиме print со вшитыми шрифтами.

export type PrintFileFormat = 'svg' | 'png';

const PRINT_DPI = 300;
const MM_PER_INCH = 25.4;

const getPixelSize = (design: PlaqueDesign) => {
  const { width, height } = PLAQUE_PRINT_SIZE_MM[design.size];
  return {
    width: Math.round((width / MM_PER_INCH) * PRINT_DPI),
    height: Math.round((height / MM_PER_INCH) * PRINT_DPI),
  };
};

const canvasToPng = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не получилось собрать PNG'))),
      'image/png',
    );
  });
};

// --- PNG: растеризация через canvas + пометка 300 dpi ---
const rasterizeSvg = async (svg: string, design: PlaqueDesign): Promise<Blob> => {
  const { width, height } = getPixelSize(design);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));

  try {
    const image = new Image();
    image.src = url;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Браузер не дал нарисовать PNG');
    }
    context.drawImage(image, 0, 0, width, height);
    return setPngDpi(await canvasToPng(canvas), PRINT_DPI);
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const renderPrintFile = async (
  design: PlaqueDesign,
  format: PrintFileFormat,
): Promise<Blob> => {
  const svg = renderPlaqueSvg(design, {
    mode: 'print',
    embeddedFontCss: await loadEmbeddedFontCss(),
    idPrefix: 'print',
  });
  if (format === 'svg') {
    return new Blob([svg], { type: 'image/svg+xml' });
  }
  return rasterizeSvg(svg, design);
};
