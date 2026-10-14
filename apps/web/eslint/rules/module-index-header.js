// index.ts модуля (features/*, entities/*, shared/*) начинается с /** … */:
// что модуль делает и с кем взаимодействует. Это первое, что читает новый разработчик.

export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'index.ts модуля начинается с комментария о назначении и связях' },
    schema: [],
    messages: {
      missing: 'Опиши модуль в начале index.ts: /** что делает, с кем взаимодействует */',
    },
  },
  create(context) {
    return {
      Program(program) {
        const [firstComment] = context.sourceCode.getAllComments();
        const isHeader =
          firstComment?.type === 'Block' &&
          firstComment.value.startsWith('*') &&
          (!program.body[0] || firstComment.range[1] <= program.body[0].range[0]);
        if (!isHeader) {
          context.report({ node: program, messageId: 'missing' });
        }
      },
    };
  },
};
