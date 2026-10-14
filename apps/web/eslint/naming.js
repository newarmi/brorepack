// ---------------------------------------------------------------------------
// 3. Нейминг
// ---------------------------------------------------------------------------

export const NAMING_CONVENTION = [
  'error',
  { selector: 'default', format: ['camelCase'], leadingUnderscore: 'allow' },
  // Модульные константы-примитивы и объекты-енумы — UPPER_SNAKE_CASE (ROUTE_NAMES, PRINT_DPI)
  { selector: 'variable', modifiers: ['const', 'global'], format: ['camelCase', 'UPPER_CASE'] },
  // boolean — с вопросом в начале: isLoading, hasProfile, IS_GAS_TRANSPORT
  {
    selector: 'variable',
    types: ['boolean'],
    format: ['PascalCase', 'UPPER_CASE'],
    prefix: ['is', 'has', 'can', 'should', 'IS_', 'HAS_'],
  },
  { selector: 'import', format: ['camelCase', 'PascalCase'] },
  { selector: 'typeLike', format: ['PascalCase'] },
  // Свойства повторяют внешние форматы: поля API (is_visible), заголовки, CSS-классы
  {
    selector: ['objectLiteralProperty', 'typeProperty', 'objectLiteralMethod', 'typeMethod'],
    format: null,
  },
];

// Сокращения в именах запрещены: имя должно читаться без контекста
export const DENIED_NAMES = [
  'e',
  'err',
  'res',
  'resp',
  'req',
  'cfg',
  'conf',
  'tmp',
  'val',
  'obj',
  'arr',
  'str',
  'num',
  'cb',
  'fn',
  'el',
  'btn',
  'idx',
  'evt',
  'ctx',
  'msg',
  'opts',
];
