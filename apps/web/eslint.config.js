import { existsSync, readdirSync } from 'node:fs';

import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import prettierConfig from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import pluginVue from 'eslint-plugin-vue';

// Слои: app → pages → features → entities → shared. Импорт разрешён только вниз по списку.
const LAYERS = ['app', 'pages', 'features', 'entities', 'shared'];

const getForbiddenLayerPatterns = (layer) => {
  const upperLayers = LAYERS.slice(0, LAYERS.indexOf(layer));
  return upperLayers.map((upperLayer) => ({
    group: [`@/${upperLayer}/**`],
    message: `Слой ${layer} не может импортировать ${upperLayer}: зависимости идут только вниз`,
  }));
};

// Из чужой папки импортируем только через алиас @/ — так сразу видно, откуда модуль
const RELATIVE_PARENT_IMPORT = {
  group: ['../*'],
  message: 'Используй алиас @/ вместо ../',
};

const layerRules = LAYERS.map((layer) => ({
  files: [`src/${layer}/**/*.{ts,vue}`],
  rules: {
    'no-restricted-imports': [
      'error',
      { patterns: [RELATIVE_PARENT_IMPORT, ...getForbiddenLayerPatterns(layer)] },
    ],
  },
}));

// Фича не импортирует другую фичу: общее поднимается в entities или shared
const featuresDir = new URL('./src/features', import.meta.url);
const featureNames = existsSync(featuresDir) ? readdirSync(featuresDir) : [];

const featureRules = featureNames.map((feature) => ({
  files: [`src/features/${feature}/**/*.{ts,vue}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          RELATIVE_PARENT_IMPORT,
          ...getForbiddenLayerPatterns('features'),
          {
            group: featureNames
              .filter((name) => name !== feature)
              .map((name) => `@/features/${name}/**`),
            message: 'Фича не импортирует другую фичу: вынеси общее в entities или shared',
          },
        ],
      },
    ],
  },
}));

export default defineConfigWithVueTs(
  { ignores: ['dist/**', 'node_modules/**'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  prettierConfig,
  {
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      curly: ['error', 'all'],
      'prefer-const': 'error',
      'no-else-return': 'error',
      complexity: ['error', 10],
      'max-depth': ['error', 2],
      'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/attribute-hyphenation': ['error', 'never'],
      'vue/v-on-event-hyphenation': ['error', 'never', { autofix: true }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': [
        'error',
        { order: ['defineEmits', 'defineModel', 'defineProps'] },
      ],
    },
  },
  {
    files: ['src/**/*.test.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
    },
  },
  ...layerRules,
  ...featureRules,
);
