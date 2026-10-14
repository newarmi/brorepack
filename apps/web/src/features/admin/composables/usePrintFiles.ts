import type { Order } from '@brorepack/shared';
import type { MaybeRefOrGetter } from 'vue';
import { shallowRef, toValue } from 'vue';

import { saveBlob } from '@/shared/lib';
import { useTelegram } from '@/shared/telegram';
import { useToast } from '@/shared/ui';

import { getPrintFile, sendPrintFilesToBot } from '../print/printFiles';
import type { PrintFileFormat } from '../print/renderPrintFile';

/** Файлы для печати: отправить в чат с ботом или скачать напрямую */
export const usePrintFiles = (order: MaybeRefOrGetter<Order | null>) => {
  const telegram = useTelegram();
  const { showToast, showErrorToast } = useToast();

  const isSendingPrint = shallowRef(false);
  const downloadingFormat = shallowRef<PrintFileFormat | null>(null);

  const sendPrint = async (): Promise<void> => {
    const current = toValue(order);
    if (!current || isSendingPrint.value) {
      return;
    }
    isSendingPrint.value = true;
    try {
      await sendPrintFilesToBot(current);
      telegram.haptic.notify('success');
      showToast('Файлы отправлены в чат с ботом', 'success');
    } catch (error) {
      showErrorToast(error);
    } finally {
      isSendingPrint.value = false;
    }
  };

  /** Запасной путь, если бот выключен: скачать файл для печати напрямую */
  const downloadPrint = async (format: PrintFileFormat): Promise<void> => {
    const current = toValue(order);
    if (!current || downloadingFormat.value) {
      return;
    }
    downloadingFormat.value = format;
    try {
      saveBlob(await getPrintFile(current, format), `brorepack-${current.number}.${format}`);
    } catch (error) {
      showErrorToast(error);
    } finally {
      downloadingFormat.value = null;
    }
  };

  return { isSendingPrint, downloadingFormat, sendPrint, downloadPrint };
};

export default usePrintFiles;
