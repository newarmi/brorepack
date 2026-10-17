import type { PlaqueArt, TemplateArtId, TemplateId } from '@brorepack/shared';
import { getSvgInnerMarkup, getTemplate } from '@brorepack/shared';
import bloodsportPreview from '@brorepack/shared/assets/plaques/bloodsport.preview.svg?url';
import bloodsportPrint from '@brorepack/shared/assets/plaques/bloodsport.svg?url';
import blueSkinPreview from '@brorepack/shared/assets/plaques/blue_skin.preview.svg?url';
import blueSkinPrint from '@brorepack/shared/assets/plaques/blue_skin.svg?url';
import deadSilencePreview from '@brorepack/shared/assets/plaques/dead_silence.preview.svg?url';
import deadSilencePrint from '@brorepack/shared/assets/plaques/dead_silence.svg?url';
import graphitePreview from '@brorepack/shared/assets/plaques/graphite.preview.svg?url';
import graphitePrint from '@brorepack/shared/assets/plaques/graphite.svg?url';
import orangePreview from '@brorepack/shared/assets/plaques/orange.preview.svg?url';
import orangePrint from '@brorepack/shared/assets/plaques/orange.svg?url';
import techPreview from '@brorepack/shared/assets/plaques/tech.preview.svg?url';
import techPrint from '@brorepack/shared/assets/plaques/tech.svg?url';

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

export const getPreviewArt = (templateId: TemplateId): PlaqueArt => {
  return { href: PREVIEW_ART_URLS[getTemplate(templateId).artId] };
};

export const loadPrintArt = async (templateId: TemplateId): Promise<PlaqueArt> => {
  const response = await fetch(PRINT_ART_URLS[getTemplate(templateId).artId]);
  if (!response.ok) {
    throw new Error('Не загрузился макет плашки');
  }
  return { markup: getSvgInnerMarkup(await response.text()) };
};
