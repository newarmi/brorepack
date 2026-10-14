import { onScopeDispose, shallowRef, watch } from 'vue';
import type { WatchSource } from 'vue';

import type { ApiError } from '@/shared/api/errors';
import { isAbortError, toApiError } from '@/shared/api/errors';

export type AsyncStatus = 'loading' | 'ready' | 'error';

/**
 * Загрузка данных для экрана: первая загрузка со скелетоном, дальше — тихое обновление.
 * Перезагружается при изменении `watchSources`; устаревший запрос отменяется.
 */
export const useAsyncData = <T>(
  loader: (signal: AbortSignal) => Promise<T>,
  watchSources: WatchSource[] = [],
) => {
  const data = shallowRef<T | null>(null);
  const status = shallowRef<AsyncStatus>('loading');
  const error = shallowRef<ApiError | null>(null);
  let controller = new AbortController();

  /** Загрузка со скелетоном. Повторный вызов отменяет предыдущий запрос */
  const load = async (): Promise<void> => {
    controller.abort();
    controller = new AbortController();
    const { signal } = controller;

    status.value = 'loading';
    error.value = null;
    try {
      data.value = await loader(signal);
      status.value = 'ready';
    } catch (loadError) {
      if (isAbortError(loadError) || signal.aborted) {
        return;
      }
      error.value = toApiError(loadError);
      status.value = 'error';
    }
  };

  /**
   * Обновление без скелетона, пока идёт явная загрузка — пропускаем.
   * Ошибку не показывает (её покажет следующий явный запрос), а после ошибки тихо восстанавливает экран
   */
  const refresh = async (): Promise<void> => {
    if (status.value === 'loading') {
      return;
    }
    const { signal } = controller;
    const value = await loader(signal);
    if (signal.aborted) {
      return;
    }
    data.value = value;
    status.value = 'ready';
    error.value = null;
  };

  const setData = (value: T): void => {
    data.value = value;
  };

  watch(watchSources, load, { immediate: true });
  onScopeDispose(() => controller.abort());

  return { data, status, error, load, refresh, setData };
};

export default useAsyncData;
