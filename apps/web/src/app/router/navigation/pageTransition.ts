import { shallowRef } from 'vue';
import type { Router } from 'vue-router';

export type PageTransitionName = 'page-forward' | 'page-back' | 'page-fade';

// Чуть дольше ухода экрана (--duration-page-out): если анимации не было, прокрутка не зависнет
const LEAVE_TIMEOUT_MS = 260;

/** Имя перехода для <Transition> в App.vue: вперёд, назад или замена экрана на месте */
export const pageTransitionName = shallowRef<PageTransitionName>('page-fade');

let resolveLeave: (() => void) | null = null;

// vue-router хранит в history.state номер записи: больше прежнего — шаг вперёд, меньше — назад
const getHistoryPosition = (): number => {
  const historyState = window.history.state as { position?: number } | null;
  return historyState?.position ?? 0;
};

const getTransitionName = (shift: number): PageTransitionName => {
  if (shift > 0) {
    return 'page-forward';
  }
  if (shift < 0) {
    return 'page-back';
  }
  return 'page-fade';
};

export const installPageTransition = (router: Router): void => {
  let position = getHistoryPosition();
  router.afterEach((_to, _from, failure) => {
    if (failure) {
      return;
    }
    const nextPosition = getHistoryPosition();
    pageTransitionName.value = getTransitionName(nextPosition - position);
    position = nextPosition;
  });
};

/** Прокрутку наверх делаем после ухода старого экрана — иначе он дёрнется вверх прямо на глазах */
export const waitForPageLeave = (): Promise<void> => {
  return new Promise((resolve) => {
    resolveLeave = resolve;
    setTimeout(resolve, LEAVE_TIMEOUT_MS);
  });
};

export const pageLeaveHandler = (): void => {
  resolveLeave?.();
  resolveLeave = null;
};
