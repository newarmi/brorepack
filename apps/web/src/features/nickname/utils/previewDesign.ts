import type { PlaqueDesign } from '@brorepack/shared';

const NICKNAME_PLACEHOLDER = 'твой ник';

/** Превью на экране ника: вводимый ник, а вместо уровня и ELO — «?», их отдаст FACEIT */
export const createNicknamePreview = (design: PlaqueDesign, nickname: string): PlaqueDesign => {
  return {
    ...design,
    displayName: nickname.trim() || NICKNAME_PLACEHOLDER,
    caption: 'for reaching ? lvl ? elo',
    level: 0,
    elo: 0,
  };
};
