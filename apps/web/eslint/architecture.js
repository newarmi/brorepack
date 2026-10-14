import { existsSync, readdirSync } from 'node:fs';

// ---------------------------------------------------------------------------
// 1. Архитектура: слои и модули
// ---------------------------------------------------------------------------

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

// zod используется только через схемы из @brorepack/shared — одна валидация на клиенте и сервере
const ZOD_IMPORT = {
  name: 'zod',
  message: 'Не используй zod напрямую: бери готовые схемы из @brorepack/shared',
};

const getRestrictedImports = (layer, extraPatterns = []) => {
  return {
    paths: [ZOD_IMPORT],
    patterns: [
      FAR_RELATIVE_IMPORT,
      ...getUpperLayerPatterns(layer),
      ...getDeepImportPatterns(layer),
      ...extraPatterns,
    ],
  };
};

export const layerRules = LAYERS.map((layer) => ({
  files: [`src/${layer}/**/*.{ts,vue}`],
  rules: {
    'no-restricted-imports': ['error', getRestrictedImports(layer)],
  },
}));

// Фича не импортирует другую фичу: общее поднимается в entities или shared
const featureNames = listSlices('features');

export const featureRules = featureNames.map((feature) => ({
  files: [`src/features/${feature}/**/*.{ts,vue}`],
  rules: {
    'no-restricted-imports': [
      'error',
      getRestrictedImports('features', [
        {
          group: featureNames
            .filter((name) => name !== feature)
            .flatMap((name) => [`@/features/${name}`, `@/features/${name}/**`]),
          message: 'Фича не импортирует другую фичу: вынеси общее в entities или shared',
        },
      ]),
    ],
  },
}));
