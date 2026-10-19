import playCyrillic400 from '@fontsource/play/files/play-cyrillic-400-normal.woff2?url';
import playCyrillic700 from '@fontsource/play/files/play-cyrillic-700-normal.woff2?url';
import playLatin400 from '@fontsource/play/files/play-latin-400-normal.woff2?url';
import playLatin700 from '@fontsource/play/files/play-latin-700-normal.woff2?url';

import { blobToBase64 } from '@/shared/lib';

const LATIN_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const CYRILLIC_RANGE = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';

interface FontSource {
  family: 'Play';
  weight: number;
  unicodeRange: string;
  url: string;
}

// Начертания — те, что использует renderPlaqueSvg: Play 400/700
const FONT_SOURCES: FontSource[] = [
  { family: 'Play', weight: 400, unicodeRange: LATIN_RANGE, url: playLatin400 },
  { family: 'Play', weight: 400, unicodeRange: CYRILLIC_RANGE, url: playCyrillic400 },
  { family: 'Play', weight: 700, unicodeRange: LATIN_RANGE, url: playLatin700 },
  { family: 'Play', weight: 700, unicodeRange: CYRILLIC_RANGE, url: playCyrillic700 },
];

const loadFontFace = async (font: FontSource): Promise<string> => {
  const response = await fetch(font.url);
  if (!response.ok) {
    throw new Error(`Не загрузился шрифт ${font.family} ${font.weight}`);
  }
  const base64 = await blobToBase64(await response.blob());
  return `@font-face{font-family:'${font.family}';font-style:normal;font-weight:${font.weight};src:url(data:font/woff2;base64,${base64}) format('woff2');unicode-range:${font.unicodeRange}}`;
};

let fontCssPromise: Promise<string> | null = null;

/** @font-face в base64: файл откроется одинаково и у типографии, у которой этих шрифтов нет */
export const loadEmbeddedFontCss = (): Promise<string> => {
  if (!fontCssPromise) {
    fontCssPromise = Promise.all(FONT_SOURCES.map(loadFontFace)).then((rules) => rules.join(''));
    // Не кэшируем ошибку — следующая попытка загрузит шрифты заново
    fontCssPromise.catch(() => {
      fontCssPromise = null;
    });
  }
  return fontCssPromise;
};
