import type { Order } from '@brorepack/shared';

import { IS_GAS_TRANSPORT } from '@/shared/config';
import { blobToBase64 } from '@/shared/lib';

import type { PrintFileUpload } from '../api/admin';
import { fetchServerPrintFile, sendPrintFiles } from '../api/admin';
import type { PrintFileFormat } from './renderPrintFile';
import { renderPrintFile } from './renderPrintFile';

// Где берутся файлы для печати: Node-сервер рендерит их сам,
// Apps Script не умеет PNG — тогда рендерит браузер админа.

const PRINT_FORMATS: PrintFileFormat[] = ['svg', 'png'];

const renderUploads = (order: Order): Promise<PrintFileUpload[]> => {
  return Promise.all(
    PRINT_FORMATS.map(async (format) => {
      const blob = await renderPrintFile(order.design, format);
      return {
        name: `print-${order.number}.${format}`,
        mimeType: blob.type,
        base64: await blobToBase64(blob),
      };
    }),
  );
};

export const sendPrintFilesToBot = async (order: Order): Promise<void> => {
  const files = IS_GAS_TRANSPORT ? await renderUploads(order) : undefined;
  await sendPrintFiles(order.id, files);
};

export const getPrintFile = (order: Order, format: PrintFileFormat): Promise<Blob> => {
  return IS_GAS_TRANSPORT
    ? renderPrintFile(order.design, format)
    : fetchServerPrintFile(order.id, format);
};
