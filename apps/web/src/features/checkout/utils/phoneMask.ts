const RU_DIGITS = 11;
// Схема телефона пускает до 15 цифр — столько и оставляем у иностранного номера
const MAX_DIGITS = 15;

/** Российский номер: 8 и 9 в начале — это +7 */
const normalizeRuDigits = (digits: string): string => {
  if (digits.startsWith('8')) {
    return `7${digits.slice(1)}`;
  }
  return digits.startsWith('9') ? `7${digits}` : digits;
};

/**
 * Маска телефона: «89001234567» → «+7 (900) 123-45-67».
 * Разделитель ставится только перед следующей цифрой — стирание с конца не упирается в «)» или «-».
 * Иностранный номер (из Telegram бывает и такой) остаётся «+цифры» без маски.
 */
export const formatPhone = (value: string): string => {
  const digits = normalizeRuDigits(value.replace(/\D/g, ''));
  if (!digits) {
    return value.includes('+') ? '+' : '';
  }
  if (!digits.startsWith('7')) {
    return `+${digits.slice(0, MAX_DIGITS)}`;
  }
  const local = digits.slice(1, RU_DIGITS);
  const parts = [
    { from: 0, to: 3, prefix: ' (' },
    { from: 3, to: 6, prefix: ') ' },
    { from: 6, to: 8, prefix: '-' },
    { from: 8, to: 10, prefix: '-' },
  ];
  return parts.reduce((text, part) => {
    const chunk = local.slice(part.from, part.to);
    return chunk ? `${text}${part.prefix}${chunk}` : text;
  }, '+7');
};
