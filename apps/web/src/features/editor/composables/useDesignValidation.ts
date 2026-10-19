import { computed } from 'vue';

import { designInputSchema } from '@brorepack/shared';

import { useCustomImageStore, useDraftStore } from '@/entities/draft';
import { CUSTOM_TEMPLATE_ID } from '@/entities/plaque';

/**
 * Проверка дизайна той же схемой, что и на сервере; ошибка показывается только у надписи.
 * На «Своём дизайне» дальше не пускаем без картинки — без неё дизайнеру не с чем работать
 */
export const useDesignValidation = () => {
  const draft = useDraftStore();
  const customImage = useCustomImageStore();

  const designResult = computed(() =>
    designInputSchema.safeParse({
      templateId: draft.templateId,
      size: draft.design.size,
      displayName: draft.displayName,
    }),
  );

  const isImageMissing = computed(
    () => draft.templateId === CUSTOM_TEMPLATE_ID && !customImage.hasImage,
  );

  const isDesignValid = computed(() => designResult.value.success && !isImageMissing.value);

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
