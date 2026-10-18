import { formatInput } from '../utils/formatInput';

/**
 * Маска для поля ввода: обработчики передаются в TextField через inputAttrs.
 * v-model поля пишет введённый текст, а мы поверх — отформатированный и ставим курсор.
 * Значение в DOM меняем сами: если маска вернула то же, что было, Vue поле не перерисует.
 */
export const useInputMask = (
  format: (value: string) => string,
  onChange: (value: string) => void,
) => {
  // Текст до правки: по нему маска понимает, что стёрли только разделитель
  let previousValue = '';

  const onBeforeinput = (event: Event): void => {
    previousValue = (event.target as HTMLInputElement).value;
  };

  const onInput = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    const result = formatInput({
      value: input.value,
      caret: input.selectionStart ?? input.value.length,
      previous: previousValue,
      inputType: (event as InputEvent).inputType ?? '',
      format,
    });
    input.value = result.value;
    input.setSelectionRange(result.caret, result.caret);
    onChange(result.value);
  };

  return { onBeforeinput, onInput };
};

export default useInputMask;
