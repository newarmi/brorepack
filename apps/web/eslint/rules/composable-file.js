// Файл в папке composables/ — один composable: имя файла = use<Что-то>,
// именованный экспорт с тем же именем и default-экспорт (как в стиле izagorin).

import { basename, extname } from 'node:path';

export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'composables/useX.ts экспортирует useX именованно и по умолчанию' },
    schema: [],
    messages: {
      fileName: 'Файл в composables/ называется use<Имя>.ts',
      namedExport: 'Экспортируй composable «{{name}}» именованно: export const {{name}} = …',
      defaultExport: 'Добавь default-экспорт: export default {{name}};',
    },
  },
  create(context) {
    const fileName = basename(context.filename, extname(context.filename));
    if (!context.filename.includes('/composables/') || fileName.endsWith('.test')) {
      return {};
    }
    let hasNamedExport = false;
    let hasDefaultExport = false;
    return {
      ExportNamedDeclaration(node) {
        const declarations = node.declaration?.declarations ?? [];
        hasNamedExport ||= declarations.some((item) => item.id.name === fileName);
      },
      ExportDefaultDeclaration() {
        hasDefaultExport = true;
      },
      'Program:exit'(program) {
        if (!/^use[A-Z]/.test(fileName)) {
          context.report({ node: program, messageId: 'fileName' });
          return;
        }
        if (!hasNamedExport) {
          context.report({ node: program, messageId: 'namedExport', data: { name: fileName } });
        }
        if (!hasDefaultExport) {
          context.report({ node: program, messageId: 'defaultExport', data: { name: fileName } });
        }
      },
    };
  },
};
