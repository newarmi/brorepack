/** Проверяет, что значение — одна из допустимых строк, и сужает тип */
export const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T => {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
};
