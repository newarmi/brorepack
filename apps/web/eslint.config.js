import { existsSync, readdirSync } from 'node:fs';

import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import prettierConfig from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import pluginVue from 'eslint-plugin-vue';

// Слои: app → pages → features → entities → shared. Импорт разрешён только вниз по списку.
const LAYERS = ['app', 'pages', 'features', 'entities', 'shared'];

const listSlices = (layer) => {
  const dir = new URL(`./src/${layer}`, import.meta.url);
  return existsSync(dir) ? readdirSync(dir) : [];
};

const getUpperLayerPatterns = (layer) => {
  const upperLayers = LAYERS.slice(0, LAYERS.indexOf(layer));
  return upperLayers.map((upperLayer) => ({
    group: [`@/${upperLayer}`, `@/${upperLayer}/**`],
    message: `Слой ${layer} не может импортировать ${upperLayer}: зависимости идут только вниз`,
  }));
};

// Внутри модуля — относительные пути не дальше соседней папки; всё остальное — через @/
const FAR_RELATIVE_IMPORT = {
  group: ['../../*'],
  message: 'Слишком далёкий относительный путь: импортируй через @/',
};

// Чужой модуль подключаем только через его index.ts — там видно, что он отдаёт наружу
const getDeepImportPatterns = (layer) => {
  const layersWithIndex =
    layer === 'shared' ? ['features', 'entities'] : ['features', 'entities', 'shared'];
  return layersWithIndex.map((target) => ({
    group: [`@/${target}/*/*`],
    message: `Импортируй модуль ${target} через его index.ts: @/${target}/<модуль>`,
  }));
};

const getRestrictedPatterns = (layer, extraPatterns = []) => {
  return [
    FAR_RELATIVE_IMPORT,
    ...getUpperLayerPatterns(layer),
    ...getDeepImportPatterns(layer),
    ...extraPatterns,
  ];
};

const layerRules = LAYERS.map((layer) => ({
  files: [`src/${layer}/**/*.{ts,vue}`],
  rules: {
    'no-restricted-imports': ['error', { patterns: getRestrictedPatterns(layer) }],
  },
}));

// Фича не импортирует другую фичу: общее поднимается в entities или shared
const featureNames = listSlices('features');

const featureRules = featureNames.map((feature) => ({
  files: [`src/features/${feature}/**/*.{ts,vue}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: getRestrictedPatterns('features', [
          {
            group: featureNames
              .filter((name) => name !== feature)
              .flatMap((name) => [`@/features/${name}`, `@/features/${name}/**`]),
            message: 'Фича не импортирует другую фичу: вынеси общее в entities или shared',
          },
        ]),
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
