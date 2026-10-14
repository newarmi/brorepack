import type { PlaqueDesign, TemplateId } from '@brorepack/shared';
import { getDefaultCaption } from '@brorepack/shared';

const SAMPLE_LEVEL = 9;
const SAMPLE_ELO = 1809;

/** Пример плашки для витрины на стартовом экране */
export const createSampleDesign = (templateId: TemplateId): PlaqueDesign => {
  return {
    templateId,
    size: 'A5',
    displayName: 'goodlifeee',
    caption: getDefaultCaption(SAMPLE_LEVEL, SAMPLE_ELO),
    level: SAMPLE_LEVEL,
    elo: SAMPLE_ELO,
  };
};
