/** id варианта в списке подсказок: на него ссылается aria-activedescendant поля */
export const getSuggestionId = (listId: string, index: number): string => {
  return `${listId}-option-${index}`;
};
