import { createOrderInputSchema } from '@brorepack/shared';
import type { MaybeRefOrGetter } from 'vue';
import { computed, reactive, shallowRef, toValue } from 'vue';

/**
 * Валидация формы оформления той же zod-схемой, что и на сервере.
 * Ошибка поля видна после blur или после попытки оплатить.
 */
export const useCheckoutValidation = (input: MaybeRefOrGetter<unknown>) => {
  const result = computed(() => createOrderInputSchema.safeParse(toValue(input)));
  const isSubmitAttempted = shallowRef(false);
  const touched = reactive(new Set<string>());

  /** «delivery.city» → первое сообщение об ошибке */
  const issues = computed<Record<string, string>>(() => {
    const parsed = result.value;
    if (parsed.success) {
      return {};
    }
    const map: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.map(String).join('.');
      map[path] ??= issue.message;
    }
    return map;
  });

  /** Текст ошибки поля, если поле уже трогали или пытались оплатить */
  const errorFor = (path: string): string | null => {
    if (!isSubmitAttempted.value && !touched.has(path)) {
      return null;
    }
    return issues.value[path] ?? null;
  };

  const touch = (path: string): void => {
    touched.add(path);
  };

  const firstIssueMessage = (): string | null => {
    return Object.values(issues.value)[0] ?? null;
  };

  return { result, isSubmitAttempted, errorFor, touch, firstIssueMessage };
};

export default useCheckoutValidation;
