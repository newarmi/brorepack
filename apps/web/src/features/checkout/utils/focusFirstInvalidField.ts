import { nextTick } from 'vue';

/** Ставит фокус на первое поле с ошибкой и прокручивает к нему. false — такого поля на экране нет */
export const focusFirstInvalidField = async (root: HTMLElement | null): Promise<boolean> => {
  await nextTick();
  const field = root?.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!field) {
    return false;
  }
  field.focus();
  field.scrollIntoView({ block: 'center', behavior: 'smooth' });
  return true;
};
