import { computed } from 'vue';

import { designInputSchema } from '@brorepack/shared';

import { useDraftStore } from '@/entities/draft';

/** Проверка дизайна той же схемой, что и на сервере; ошибка показывается только у надписи */
export const useDesignValidation = () => {
  const draft = useDraftStore();

  const designResult = computed(() =>
    designInputSchema.safeParse({
      templateId: draft.templateId,
      size: draft.design.size,
      displayName: draft.displayName,
    }),
  );

  const isDesignValid = computed(() => designResult.value.success);

  const displayNameError = computed(() => {
    const result = designResult.value;
    if (result.success) {
      return null;
    }
    const issue = result.error.issues.find((item) => item.path[0] === 'displayName');
    return issue?.message ?? null;
  });

  return { isDesignValid, displayNameError };
};

export default useDesignValidation;
