import { isOneOf } from '@/shared/lib';

import { IMAGE_LIMITS, IMAGE_MIME_TYPES } from '../constants/image';
import type { ImageSize } from './imageTransform';

// Файл клиента обрабатывается только в браузере: проверка, декодирование и уменьшение через canvas.
// На сервер он не уходит

export interface ImageFileResult extends ImageSize {
  blob: Blob;
}

/** Ошибка с текстом для клиента */
export class ImageFileError extends Error {}

const EXTENSION_TYPES: Record<string, (typeof IMAGE_MIME_TYPES)[number]> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/** Часть Android-галерей отдаёт файл без MIME — тогда смотрим на расширение */
const getMimeType = (file: File): string => {
  if (file.type) {
    return file.type;
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TYPES[extension] ?? '';
};

const decodeImage = async (blob: Blob): Promise<HTMLImageElement> => {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    // decode() отклоняется, если внутри не картинка, хотя расширение и MIME правильные
    await image.decode();
    return image;
  } catch {
    throw new ImageFileError(
      'Не получилось открыть картинку: файл повреждён или это не изображение',
    );
  } finally {
    URL.revokeObjectURL(url);
  }
};

const canvasToBlob = (canvas: HTMLCanvasElement, type: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Safari не умеет WebP в toBlob и отдаст PNG — прозрачность сохранится и так
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new ImageFileError('Не получилось обработать картинку')),
      type,
      0.9,
    );
  });
};

/** Крупное фото с камеры уменьшаем: превью и черновик не таскают десятки мегапикселей */
const downscaleImage = async (image: HTMLImageElement, type: string): Promise<ImageFileResult> => {
  const ratio = IMAGE_LIMITS.maxSide / Math.max(image.naturalWidth, image.naturalHeight);
  const width = Math.round(image.naturalWidth * ratio);
  const height = Math.round(image.naturalHeight * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new ImageFileError('Браузер не дал обработать картинку');
  }
  context.drawImage(image, 0, 0, width, height);
  return { blob: await canvasToBlob(canvas, type), width, height };
};

/** Проверяет файл и готовит картинку для плашки; при ошибке бросает ImageFileError с понятным текстом */
export const readImageFile = async (file: File): Promise<ImageFileResult> => {
  const type = getMimeType(file);
  if (!isOneOf(IMAGE_MIME_TYPES, type)) {
    throw new ImageFileError('Подойдёт картинка PNG, JPG или WebP');
  }
  if (file.size > IMAGE_LIMITS.maxFileBytes) {
    throw new ImageFileError('Файл больше 20 МБ — выбери картинку поменьше');
  }

  const image = await decodeImage(file);
  if (Math.max(image.naturalWidth, image.naturalHeight) > IMAGE_LIMITS.maxSide) {
    return downscaleImage(image, type);
  }
  return { blob: file, width: image.naturalWidth, height: image.naturalHeight };
};
