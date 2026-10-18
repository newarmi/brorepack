// ---------------------------------------------------------------------------
// 2. Единые точки доступа и «никаких магических строк»
// ---------------------------------------------------------------------------

// Значения, которые сравниваем только через константы: ORDER_STATUS, PAYMENT_STATUS,
// CUSTOM_TEMPLATE_ID, DELIVERY_METHOD
const DOMAIN_LITERALS =
  '/^(awaiting_payment|paid|printing|shipped|delivered|cancelled|pending|failed|unavailable|custom|cdek_pvz|courier)$/';

const RESTRICTED_SYNTAX = {
  env: {
    selector: "MemberExpression[object.type='MetaProperty'][property.name='env']",
    message: 'import.meta.env читается только в shared/config/env.ts',
  },
  telegram: {
    selector: "MemberExpression[object.name='window'][property.name='Telegram']",
    message: 'Telegram WebApp доступен только через @/shared/telegram',
  },
  fetch: {
    selector: "CallExpression[callee.name='fetch']",
    message: 'Запросы к бэкенду — через call() из @/shared/api, а не fetch',
  },
  storage: {
    selector: 'MemberExpression[object.name=/^(localStorage|sessionStorage)$/]',
    message: 'Браузерное хранилище — только в entities/draft/utils/storage.ts',
  },
  domainLiteral: {
    selector: `BinaryExpression[operator=/^[!=]==$/] > Literal[value=${DOMAIN_LITERALS}], SwitchCase > Literal[value=${DOMAIN_LITERALS}]`,
    message:
      'Не сравнивай со строкой: используй константу (ORDER_STATUS, PAYMENT_STATUS, CUSTOM_TEMPLATE_ID, DELIVERY_METHOD)',
  },
  routeName: {
    selector:
      "CallExpression[callee.property.name=/^(push|replace)$/] > ObjectExpression > Property[key.name='name'] > Literal",
    message: 'Имя маршрута — только из ROUTE_NAMES',
  },
  enum: {
    selector: 'TSEnumDeclaration',
    message: 'Вместо enum — объект-константа с as const (как ORDER_STATUS)',
  },
  forIn: {
    selector: 'ForInStatement',
    message: 'Вместо for…in — for…of по Object.entries/keys',
  },
};

/** Список запретов без тех, что разрешены конкретному файлу */
export const getRestrictedSyntax = (...allowedKeys) => {
  return Object.entries(RESTRICTED_SYNTAX)
    .filter(([key]) => !allowedKeys.includes(key))
    .map(([, rule]) => rule);
};

export const restrictedSyntaxExceptions = [
  { files: ['src/shared/config/env.ts'], allow: ['env'] },
  { files: ['src/shared/telegram/webApp/webApp.ts'], allow: ['telegram'] },
  // Шрифты и макеты плашки для печати — статические файлы приложения, а не запрос к API
  {
    files: [
      'src/shared/api/transports/http.ts',
      'src/features/admin/print/embeddedFonts.ts',
      'src/entities/plaque/utils/art.ts',
    ],
    allow: ['fetch'],
  },
  { files: ['src/entities/draft/utils/storage.ts'], allow: ['storage'] },
  // Проверка свежей сборки: version.json — статический файл, а номер перезагрузки — не черновик
  { files: ['src/app/update/reloadIfOutdated.ts'], allow: ['fetch', 'storage'] },
  {
    files: ['src/**/*.test.ts', 'src/shared/testing/**'],
    allow: ['storage', 'telegram', 'domainLiteral', 'fetch'],
  },
].map(({ files, allow }) => ({
  files,
  rules: { 'no-restricted-syntax': ['error', ...getRestrictedSyntax(...allow)] },
}));
