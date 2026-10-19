import type { PlaqueArt, TemplateArtId, TemplateId } from '@brorepack/shared';
import { getSvgInnerMarkup, getTemplate } from '@brorepack/shared';
import bloodsportFront from '@brorepack/shared/assets/plaques/bloodsport.front.svg?url';
import bloodsportPreview from '@brorepack/shared/assets/plaques/bloodsport.preview.svg?url';
import bloodsportPrint from '@brorepack/shared/assets/plaques/bloodsport.svg?url';
import blueSkinFront from '@brorepack/shared/assets/plaques/blue_skin.front.svg?url';
import blueSkinPreview from '@brorepack/shared/assets/plaques/blue_skin.preview.svg?url';
import blueSkinPrint from '@brorepack/shared/assets/plaques/blue_skin.svg?url';
import deadSilenceFront from '@brorepack/shared/assets/plaques/dead_silence.front.svg?url';
import deadSilencePreview from '@brorepack/shared/assets/plaques/dead_silence.preview.svg?url';
import deadSilencePrint from '@brorepack/shared/assets/plaques/dead_silence.svg?url';
import graphiteFront from '@brorepack/shared/assets/plaques/graphite.front.svg?url';
import graphitePreview from '@brorepack/shared/assets/plaques/graphite.preview.svg?url';
import graphitePrint from '@brorepack/shared/assets/plaques/graphite.svg?url';
import orangeFront from '@brorepack/shared/assets/plaques/orange.front.svg?url';
import orangePreview from '@brorepack/shared/assets/plaques/orange.preview.svg?url';
import orangePrint from '@brorepack/shared/assets/plaques/orange.svg?url';
import techFront from '@brorepack/shared/assets/plaques/tech.front.svg?url';
import techPreview from '@brorepack/shared/assets/plaques/tech.preview.svg?url';
import techPrint from '@brorepack/shared/assets/plaques/tech.svg?url';

import { blobToBase64 } from '@/shared/lib';

// Арт шаблонов (фон, стрелка, знак FACEIT) — файлы из макетов дизайнера.
// В превью — лёгкая версия по ссылке, в файле для печати — полная, встроенная в SVG

const PREVIEW_ART_URLS: Record<TemplateArtId, string> = {
  graphite: graphitePreview,
  dead_silence: deadSilencePreview,
  blue_skin: blueSkinPreview,
  bloodsport: bloodsportPreview,
  tech: techPreview,
  orange: orangePreview,
};

const PRINT_ART_URLS: Record<TemplateArtId, string> = {
  graphite: graphitePrint,
  dead_silence: deadSilencePrint,
  blue_skin: blueSkinPrint,
  bloodsport: bloodsportPrint,
  tech: techPrint,
  orange: orangePrint,
};

// Буквы FACEIT и стрелка отдельно — их кладут поверх картинки клиента
const FRONT_ART_URLS: Record<TemplateArtId, string> = {
  graphite: graphiteFront,
  dead_silence: deadSilenceFront,
  blue_skin: blueSkinFront,
  bloodsport: bloodsportFront,
  tech: techFront,
  orange: orangeFront,
};

export const getPreviewArt = (templateId: TemplateId): PlaqueArt => {
  return { href: PREVIEW_ART_URLS[getTemplate(templateId).artId] };
};

export const getFrontArt = (templateId: TemplateId): PlaqueArt => {
  return { href: FRONT_ART_URLS[getTemplate(templateId).artId] };
};

export const loadPrintArt = async (templateId: TemplateId): Promise<PlaqueArt> => {
  const response = await fetch(PRINT_ART_URLS[getTemplate(templateId).artId]);
  if (!response.ok) {
    throw new Error('Не загрузился макет плашки');
  }
  return { markup: getSvgInnerMarkup(await response.text()) };
};

export type InlineArtKind = 'preview' | 'front';

const INLINE_ART_URLS: Record<InlineArtKind, Record<TemplateArtId, string>> = {
  preview: PREVIEW_ART_URLS,
  front: FRONT_ART_URLS,
};

const inlineArtCache = new Map<string, Promise<PlaqueArt>>();

const fetchInlineArt = async (url: string): Promise<PlaqueArt> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Не загрузился макет плашки');
  }
  return { href: `data:image/svg+xml;base64,${await blobToBase64(await response.blob())}` };
};

/**
 * Арт превью как data URL — для SVG, который рисуется как картинка (3D-текстура):
 * такой SVG не загружает внешние ссылки. Markup не подходит — id внутри арта и переднего слоя совпадают
 */
export const loadInlineArt = (templateId: TemplateId, kind: InlineArtKind): Promise<PlaqueArt> => {
  const url = INLINE_ART_URLS[kind][getTemplate(templateId).artId];
  let artPromise = inlineArtCache.get(url);
  if (!artPromise) {
    artPromise = fetchInlineArt(url);
    inlineArtCache.set(url, artPromise);
    // Ошибку не кэшируем — следующая попытка загрузит файл заново
    artPromise.catch(() => inlineArtCache.delete(url));
  }
  return artPromise;
};
