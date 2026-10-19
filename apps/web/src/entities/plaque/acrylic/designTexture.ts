import type { PlaqueDesign, PlaqueImage } from '@brorepack/shared';
import { PLAQUE_VIEWBOX, renderPlaqueSvg } from '@brorepack/shared';
import { CanvasTexture, SRGBColorSpace } from 'three/webgpu';

import { loadInlineArt } from '../utils/art';
import { loadEmbeddedFontCss } from '../utils/embeddedFonts';
import { DESIGN_TEXTURE } from './config';

export interface DesignTextureInput {
  design: PlaqueDesign;
  image: PlaqueImage | null;
  /** Ширина плашки на экране в CSS-пикселях — от неё считается разрешение текстуры */
  displayWidth: number;
}

/** Картинка по ссылке (blob:, data:) — уже декодированная */
const loadImage = async (src: string): Promise<HTMLImageElement> => {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  await image.decode();
  return image;
};

const imageDataUrlCache = new Map<string, Promise<string>>();

/**
 * Картинка клиента как data URL: SVG, нарисованный как картинка, не загружает внешние ссылки, даже blob:.
 * Заодно уменьшаем её — в текстуру всё равно не попадёт больше DESIGN_TEXTURE.maxWidth пикселей
 */
const convertImageToDataUrl = async (href: string): Promise<string> => {
  const image = await loadImage(href);
  const scale = Math.min(1, DESIGN_TEXTURE.maxImageSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
};

const loadImageDataUrl = (href: string): Promise<string> => {
  let dataUrl = imageDataUrlCache.get(href);
  if (!dataUrl) {
    dataUrl = convertImageToDataUrl(href);
    imageDataUrlCache.set(href, dataUrl);
    dataUrl.catch(() => imageDataUrlCache.delete(href));
  }
  return dataUrl;
};

/** Размер текстуры: ширина на экране × DPR × запас на поворот, не больше лимита. Пропорции — как у листа */
export const getDesignTextureSize = (
  displayWidth: number,
  pixelRatio: number,
): { width: number; height: number } => {
  const width = Math.min(
    DESIGN_TEXTURE.maxWidth,
    Math.max(256, Math.round(displayWidth * pixelRatio * DESIGN_TEXTURE.oversample)),
  );
  return { width, height: Math.round((width * PLAQUE_VIEWBOX.height) / PLAQUE_VIEWBOX.width) };
};

/**
 * Тот же SVG, что в превью и в файле для печати, но самодостаточный:
 * арт, картинка клиента и шрифт Play встроены как data URL
 */
const buildStandaloneSvg = async (input: DesignTextureInput): Promise<string> => {
  const { design, image } = input;
  const [art, frontArt, embeddedFontCss, imageHref] = await Promise.all([
    loadInlineArt(design.templateId, 'preview'),
    image ? loadInlineArt(design.templateId, 'front') : undefined,
    loadEmbeddedFontCss(),
    image ? loadImageDataUrl(image.href) : undefined,
  ]);
  return renderPlaqueSvg(design, {
    art,
    frontArt,
    embeddedFontCss,
    image: image && imageHref ? { ...image, href: imageHref } : undefined,
    idPrefix: 'plaque-3d',
  });
};

/** Растеризация SVG в canvas нужного размера */
const rasterizeSvg = async (
  svg: string,
  size: { width: number; height: number },
): Promise<HTMLCanvasElement> => {
  // В превью SVG тянется на 100% контейнера; у картинки контейнера нет — задаём размер явно,
  // иначе Safari растеризует в маленький размер по умолчанию и растягивает мыло
  const sizedSvg = svg.replace(
    'width="100%" height="100%"',
    `width="${size.width}" height="${size.height}"`,
  );
  const url = URL.createObjectURL(new Blob([sizedSvg], { type: 'image/svg+xml' }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D недоступен');
    }
    context.drawImage(image, 0, 0, size.width, size.height);
    // WebKit иногда не успевает дорисовать вложенные data-картинки к первому drawImage — рисуем ещё раз через кадр
    await new Promise((resolve) => requestAnimationFrame(resolve));
    context.clearRect(0, 0, size.width, size.height);
    context.drawImage(image, 0, 0, size.width, size.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * Текстура лицевой грани: текст, иконки, арт и картинка клиента — из SVG, с прозрачностью по контуру.
 * Мипмапы и анизотропия держат мелкий текст читаемым при наклоне
 */
export const createDesignTexture = async (
  input: DesignTextureInput,
  pixelRatio: number,
  maxAnisotropy: number,
): Promise<CanvasTexture> => {
  const svg = await buildStandaloneSvg(input);
  const canvas = await rasterizeSvg(svg, getDesignTextureSize(input.displayWidth, pixelRatio));
  const designTexture = new CanvasTexture(canvas);
  designTexture.colorSpace = SRGBColorSpace;
  designTexture.anisotropy = Math.min(DESIGN_TEXTURE.anisotropy, maxAnisotropy);
  designTexture.generateMipmaps = true;
  return designTexture;
};
