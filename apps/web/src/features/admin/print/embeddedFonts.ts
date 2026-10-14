import onestCyrillic400 from '@fontsource/onest/files/onest-cyrillic-400-normal.woff2?url';
import onestCyrillic600 from '@fontsource/onest/files/onest-cyrillic-600-normal.woff2?url';
import onestLatin400 from '@fontsource/onest/files/onest-latin-400-normal.woff2?url';
import onestLatin600 from '@fontsource/onest/files/onest-latin-600-normal.woff2?url';
import unboundedCyrillic700 from '@fontsource/unbounded/files/unbounded-cyrillic-700-normal.woff2?url';
import unboundedCyrillic900 from '@fontsource/unbounded/files/unbounded-cyrillic-900-normal.woff2?url';
import unboundedLatin700 from '@fontsource/unbounded/files/unbounded-latin-700-normal.woff2?url';
import unboundedLatin900 from '@fontsource/unbounded/files/unbounded-latin-900-normal.woff2?url';

import { blobToBase64 } from '@/shared/lib/files';

const LATIN_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const CYRILLIC_RANGE = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';

interface FontSource {
  family: 'Unbounded' | 'Onest';
  weight: number;
  unicodeRange: string;
  url: string;
}

// Начертания — те, что использует renderPlaqueSvg: Unbounded 700/900, Onest 400/600
const FONT_SOURCES: FontSource[] = [
  { family: 'Unbounded', weight: 700, unicodeRange: LATIN_RANGE, url: unboundedLatin700 },
  { family: 'Unbounded', weight: 700, unicodeRange: CYRILLIC_RANGE, url: unboundedCyrillic700 },
  { family: 'Unbounded', weight: 900, unicodeRange: LATIN_RANGE, url: unboundedLatin900 },
  { family: 'Unbounded', weight: 900, unicodeRange: CYRILLIC_RANGE, url: unboundedCyrillic900 },
  { family: 'Onest', weight: 400, unicodeRange: LATIN_RANGE, url: onestLatin400 },
  { family: 'Onest', weight: 400, unicodeRange: CYRILLIC_RANGE, url: onestCyrillic400 },
  { family: 'Onest', weight: 600, unicodeRange: LATIN_RANGE, url: onestLatin600 },
  { family: 'Onest', weight: 600, unicodeRange: CYRILLIC_RANGE, url: onestCyrillic600 },
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
