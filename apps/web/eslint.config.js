import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import prettierConfig from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import pluginVue from 'eslint-plugin-vue';

import { featureRules, layerRules } from './eslint/architecture.js';
import { DENIED_NAMES, NAMING_CONVENTION } from './eslint/naming.js';
import localPlugin from './eslint/plugin.js';
import { getRestrictedSyntax, restrictedSyntaxExceptions } from './eslint/restrictedSyntax.js';

// Правила проекта — apps/web/CLAUDE.md. Каждое правило проверяет одно из них.
// Главный принцип: код понятен обычному разработчику с первого прочтения.
//
// eslint/architecture.js     — слои, модули через index.ts, фичи не видят друг друга
// eslint/restrictedSyntax.js — единые точки доступа (env, Telegram, API, хранилище), без магических строк
// eslint/naming.js           — нейминг: boolean с is/has, UPPER_CASE для констант, без сокращений
// eslint/rules/*             — правила, которых нет в плагинах: *Handler, composables, шапка index.ts

export default defineConfigWithVueTs(
  { ignores: ['dist/**', 'node_modules/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommendedTypeChecked,
  prettierConfig,

  {
    plugins: { 'simple-import-sort': simpleImportSort, local: localPlugin },
    rules: {
      // --- Импорты: vue-пакеты → остальные пакеты → @/ → относительные (как у izagorin)
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:'],
            ['^vue$', '^vue-router$', '^pinia$', '^vue', '^pinia'],
            ['^@?\\w'],
            ['^@/'],
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],

      // --- Простота: короткие функции, мелкая вложенность, без хитрых конструкций
      complexity: ['error', 10],
      'max-depth': ['error', 2],
      'max-params': ['error', 3],
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['error', 3],
      'no-nested-ternary': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-lonely-if': 'error',
      'no-implicit-coercion': 'error',
      'no-param-reassign': ['error', { props: true }],
      'no-restricted-syntax': ['error', ...getRestrictedSyntax()],

      // --- Стиль izagorin
      curly: ['error', 'all'],
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'object-shorthand': ['error', 'always'],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',

      // --- Нейминг
      '@typescript-eslint/naming-convention': NAMING_CONVENTION,
      'id-denylist': ['error', ...DENIED_NAMES],
      'local/handler-naming': 'error',
      'local/composable-file': 'error',

      // --- TypeScript: без «доверься мне» и с проверкой полноты
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      // Для строк `||` оставляем: пустая строка тоже должна заменяться значением по умолчанию
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true } },
      ],
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // --- Vue: порядок, макросы, шаблон
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': [
        'error',
        { order: ['defineEmits', 'defineModel', 'defineProps', 'defineSlots'] },
      ],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/define-emits-declaration': ['error', 'type-literal'],
      'vue/require-macro-variable-name': [
        'error',
        {
          defineProps: 'props',
          defineEmits: 'emits',
          defineSlots: 'slots',
          useSlots: 'slots',
          useAttrs: 'attrs',
        },
      ],
      'vue/require-explicit-slots': 'error',
      'vue/no-unused-properties': ['error', { groups: ['props'] }],
      'vue/no-unused-emit-declarations': 'error',
      'vue/no-unused-refs': 'error',
      'vue/no-undef-components': 'error',
      'vue/no-ref-object-reactivity-loss': 'error',
      'vue/prefer-use-template-ref': 'error',
      'vue/require-typed-ref': 'error',
      'vue/max-props': ['error', { maxProps: 6 }],
      'vue/max-template-depth': ['error', { maxDepth: 7 }],
      'vue/attribute-hyphenation': ['error', 'never'],
      'vue/v-on-event-hyphenation': ['error', 'never', { autofix: true }],
      'vue/v-bind-style': ['error', 'shorthand', { sameNameShorthand: 'always' }],
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/prefer-true-attribute-shorthand': 'error',
      'vue/no-useless-v-bind': 'error',
      'vue/prefer-separate-static-class': 'error',
      'vue/no-static-inline-styles': 'error',
      'vue/padding-line-between-blocks': 'error',
      'vue/no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='name'] > Literal",
          message: 'Имя маршрута в :to — только из ROUTE_NAMES',
        },
      ],
    },
  },

  // index.ts модулей описывает модуль и его связи
  {
    files: ['src/{features,entities,shared}/*/index.ts'],
    rules: { 'local/module-index-header': 'error' },
  },

  // Базовые компоненты по природе настраиваемые: у поля ввода много атрибутов
  {
    files: ['src/shared/ui/components/**/*.vue'],
    rules: { 'vue/max-props': ['error', { maxProps: 16 }] },
  },

  // Тесты: длинные сценарии и моки — норма
  {
    files: ['src/**/*.test.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'max-nested-callbacks': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },

  // Конфиги сборки и сам eslint — обычный Node-код (для .js типизированный линт отключён пресетом)
  {
    files: ['*.{js,ts}', 'eslint/**/*.js'],
    rules: {
      '@typescript-eslint/naming-convention': 'off',
      'id-denylist': 'off',
      'no-restricted-syntax': 'off',
    },
  },

  ...layerRules,
  ...featureRules,
  ...restrictedSyntaxExceptions,
);
