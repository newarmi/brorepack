import { onBeforeUnmount, onMounted } from 'vue';

/**
 * Периодически вызывает `task`, пока компонент смонтирован.
 * Не накладывает вызовы друг на друга и не опрашивает, пока вкладка скрыта.
 */
export const usePolling = (task: () => Promise<unknown>, intervalMs: number): void => {
  let timer: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;

  const tick = async (): Promise<void> => {
    if (isRunning || document.hidden) {
      return;
    }
    isRunning = true;
    try {
      await task();
    } catch {
      // Фоновое обновление: ошибку покажет следующий явный запрос
    } finally {
      isRunning = false;
    }
  };

  onMounted(() => {
    timer = setInterval(tick, intervalMs);
  });

  onBeforeUnmount(() => {
    if (timer) {
      clearInterval(timer);
    }
    timer = null;
  });
};

export default usePolling;
