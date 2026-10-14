// Обработчик события из шаблона, объявленный в <script setup>, называется *Handler:
// так по имени видно, что функцию вызывает интерфейс, а не другой код.
// Функции из composables (load, reload, submit) и вызовы с аргументами не проверяем.

const HANDLER_SUFFIX = /Handler$/;

const isFunctionInit = (node) => {
  return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression';
};

/** Имена функций, объявленных на верхнем уровне <script setup>: function x() {} и const x = () => {} */
const getDeclaredFunctionNames = (statement) => {
  if (statement.type === 'FunctionDeclaration') {
    return statement.id ? [statement.id.name] : [];
  }
  if (statement.type !== 'VariableDeclaration') {
    return [];
  }
  return statement.declarations
    .filter((declarator) => declarator.id.type === 'Identifier' && isFunctionInit(declarator.init))
    .map((declarator) => declarator.id.name);
};

const collectLocalFunctions = (program) => {
  return new Set(program.body.flatMap(getDeclaredFunctionNames));
};

export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'Обработчики событий из шаблона называются *Handler' },
    schema: [],
    messages: {
      suffix: 'Обработчик «{{name}}» из шаблона назови с суффиксом Handler: «{{name}}Handler»',
    },
  },
  create(context) {
    const parserServices = context.sourceCode.parserServices;
    if (!parserServices?.defineTemplateBodyVisitor) {
      return {};
    }
    let localFunctions = new Set();
    return parserServices.defineTemplateBodyVisitor(
      {
        'VAttribute[directive=true][key.name.name="on"] > VExpressionContainer > Identifier'(node) {
          if (localFunctions.has(node.name) && !HANDLER_SUFFIX.test(node.name)) {
            context.report({ node, messageId: 'suffix', data: { name: node.name } });
          }
        },
      },
      {
        Program(program) {
          localFunctions = collectLocalFunctions(program);
        },
      },
    );
  },
};
