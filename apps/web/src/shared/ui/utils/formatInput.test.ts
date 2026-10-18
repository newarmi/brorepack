import { describe, expect, it } from 'vitest';

import { formatInput } from './formatInput';

// Простая маска: группы по две цифры через дефис
const format = (value: string): string => {
  return value.replace(/\D/g, '').replace(/(\d{2})(?=\d)/g, '$1-');
};

describe('formatInput', () => {
  it('keeps caret at the end while typing at the end', () => {
    expect(
      formatInput({ value: '12-3', caret: 4, previous: '12-', inputType: 'insertText', format }),
    ).toEqual({ value: '12-3', caret: 4 });
    expect(
      formatInput({ value: '123', caret: 3, previous: '12', inputType: 'insertText', format }),
    ).toEqual({ value: '12-3', caret: 4 });
  });

  it('keeps caret after the same digit when editing in the middle', () => {
    // Вставили 9 после «1» в «12-34»
    expect(
      formatInput({
        value: '192-34',
        caret: 2,
        previous: '12-34',
        inputType: 'insertText',
        format,
      }),
    ).toEqual({ value: '19-23-4', caret: 2 });
  });

  it('backspace over separator removes the digit before it', () => {
    // «12-34», курсор после «-», Backspace стёр «-»
    expect(
      formatInput({
        value: '1234',
        caret: 2,
        previous: '12-34',
        inputType: 'deleteContentBackward',
        format,
      }),
    ).toEqual({ value: '13-4', caret: 1 });
  });
});
