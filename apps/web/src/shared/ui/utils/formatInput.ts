/** Значимые символы — буквы и цифры. Пробелы, скобки и дефисы маски не в счёт */
const SIGNIFICANT_PATTERN = /[\p{L}\d]/u;

const checkSignificant = (char: string): boolean => SIGNIFICANT_PATTERN.test(char);

const countSignificant = (text: string, end = text.length): number => {
  return [...text.slice(0, end)].filter(checkSignificant).length;
};

/** Позиция сразу после count-го значимого символа */
const findPositionAfter = (text: string, count: number): number => {
  if (count <= 0) {
    return 0;
  }
  let seen = 0;
  for (let index = 0; index < text.length; index += 1) {
    seen += checkSignificant(text[index] ?? '') ? 1 : 0;
    if (seen === count) {
      return index + 1;
    }
  }
  return text.length;
};

/** Позиция count-го (с нуля) значимого символа */
const findSignificantIndex = (text: string, count: number): number => {
  return [...text].findIndex((char, index) => {
    return checkSignificant(char) && countSignificant(text, index) === count;
  });
};

export interface FormatInputState {
  value: string;
  caret: number;
}

interface FormatInputOptions extends FormatInputState {
  /** Значение до правки: по нему видно, что стёрли только разделитель */
  previous: string;
  inputType: string;
  format: (value: string) => string;
}

/**
 * Стёрли только разделитель маски («)», «-») — стираем и цифру рядом:
 * иначе маска вернёт разделитель обратно и курсор не сдвинется с места.
 */
const removeSkippedSignificant = (options: FormatInputOptions): FormatInputState => {
  const { value, caret, previous, inputType } = options;
  const isDelete = inputType.startsWith('delete') && value.length < previous.length;
  if (!isDelete || countSignificant(value) !== countSignificant(previous)) {
    return { value, caret };
  }
  const before = countSignificant(value, caret);
  const target = inputType === 'deleteContentBackward' ? before - 1 : before;
  const index = target < 0 ? -1 : findSignificantIndex(value, target);
  if (index === -1) {
    return { value, caret };
  }
  return { value: value.slice(0, index) + value.slice(index + 1), caret: index };
};

/**
 * Применяет маску к правке в поле и считает, где теперь курсор.
 * Курсор привязан к числу значимых символов перед ним, а не к позиции: маска добавляет и убирает разделители.
 * Печатают чаще всего в конце — тогда курсор остаётся в конце.
 */
export const formatInput = (options: FormatInputOptions): FormatInputState => {
  const raw = removeSkippedSignificant(options);
  const value = options.format(raw.value);
  if (raw.caret >= raw.value.length) {
    return { value, caret: value.length };
  }
  return { value, caret: findPositionAfter(value, countSignificant(raw.value, raw.caret)) };
};
