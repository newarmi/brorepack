import { onScopeDispose, shallowRef, toValue, watch } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

// Пиксельные глифы, которые мелькают вместо букв, пока надпись «расшифровывается»
const GLYPHS = '█▓▒░<>/\\|#*+=_';
const GLYPH_STEP_MS = 50;
const REVEAL_START_MS = 90;
const REVEAL_STAGGER_MS = 28;
const REVEAL_MAX_MS = 520;

const getRandomGlyph = (): string => GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '#';

// Цифры крутятся своими барабанами, пробелы не трогаем
const checkScramblable = (char: string): boolean => !/[\d\s]/.test(char);

/**
 * Какие позиции поменялись. Символ считаем прежним, если он совпал со старой строкой
 * хотя бы при выравнивании по началу или по концу: «Оплатить 990 ₽» → «Оплатить 1 080 ₽»
 * не трогает ни «Оплатить», ни «₽»
 */
const findChanged = (next: string[], previous: string[]): boolean[] => {
  const shift = previous.length - next.length;
  return next.map((char, index) => char !== previous[index] && char !== previous[index + shift]);
};

const checkReducedMotion = (): boolean => {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
};

/**
 * «Расшифровка» надписи при смене: изменившиеся буквы перебирают глифы и проявляются слева направо.
 * Возвращает подмену символов по позициям; null — показывать текст как есть.
 */
export const useTextScramble = (text: MaybeRefOrGetter<string>) => {
  const scrambled = shallowRef<(string | null)[] | null>(null);
  let timer: ReturnType<typeof setInterval> | undefined;

  const stop = (): void => {
    clearInterval(timer);
    scrambled.value = null;
  };

  // Глифы меняются ступенькой раз в GLYPH_STEP_MS — мерцание «пиксельное», а не плавное
  const play = (target: string[], changed: boolean[]): void => {
    let elapsed = 0;
    const render = (): void => {
      scrambled.value = target.map((char, index) => {
        const revealAt = Math.min(REVEAL_START_MS + index * REVEAL_STAGGER_MS, REVEAL_MAX_MS);
        const isHidden = changed[index] && checkScramblable(char) && elapsed < revealAt;
        return isHidden ? getRandomGlyph() : null;
      });
    };
    render();
    timer = setInterval(() => {
      elapsed += GLYPH_STEP_MS;
      if (elapsed >= REVEAL_MAX_MS) {
        stop();
        return;
      }
      render();
    }, GLYPH_STEP_MS);
  };

  watch(
    () => toValue(text),
    (next, previous) => {
      stop();
      if (checkReducedMotion()) {
        return;
      }
      const target = [...next];
      const changed = findChanged(target, [...previous]);
      if (changed.some((isChanged, index) => isChanged && checkScramblable(target[index] ?? ''))) {
        play(target, changed);
      }
    },
  );

  onScopeDispose(stop);

  return { scrambled };
};

export default useTextScramble;
