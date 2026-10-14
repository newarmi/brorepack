import composableFile from './rules/composable-file.js';
import handlerNaming from './rules/handler-naming.js';
import moduleIndexHeader from './rules/module-index-header.js';

// Правила проекта, которых нет в готовых плагинах. Подключены в eslint.config.js как «local/*»
export default {
  meta: { name: 'eslint-plugin-local' },
  rules: {
    'composable-file': composableFile,
    'handler-naming': handlerNaming,
    'module-index-header': moduleIndexHeader,
  },
};
