import type { PlaqueDesign } from '@brorepack/shared';
import { getTemplate } from '@brorepack/shared';

/** «Плашка «Blue Ninja»» */
export const formatPlaqueTitle = (design: Pick<PlaqueDesign, 'templateId'>): string => {
  return `Плашка «${getTemplate(design.templateId).name}»`;
};

/** «A5 · goodlifeee · 9 lvl» */
export const formatDesignSummary = (design: PlaqueDesign): string => {
  return [design.size, design.displayName, `${design.level} lvl`].filter(Boolean).join(' · ');
};
