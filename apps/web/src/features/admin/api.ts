import type { Order, OrderStatus, UpdateOrderStatusInput } from '@brorepack/shared';

import { call } from '@/shared/api/client';
import { requestRestBlob } from '@/shared/api/transports/rest';

import type { PrintFileFormat } from './print/renderPrintFile';

export interface PrintFileUpload {
  name: string;
  mimeType: string;
  base64: string;
}

export const fetchAdminOrders = (status?: OrderStatus, signal?: AbortSignal): Promise<Order[]> => {
  return call<Order[]>(
    {
      rest: { path: '/admin/orders', query: { status } },
      gas: { action: 'admin.orders.list', params: status ? { status } : {} },
    },
    signal,
  );
};

export const updateAdminOrder = (id: number, input: UpdateOrderStatusInput): Promise<Order> => {
  return call<Order>({
    rest: { path: `/admin/orders/${id}`, method: 'PATCH', body: input },
    gas: { action: 'admin.orders.update', params: { id, ...input } },
  });
};

/**
 * Бот присылает админу print.svg и print.png в личку.
 * Node-сервер рендерит файлы сам; Apps Script не умеет PNG — файлы рендерит браузер админа
 * и передаёт их в `files`.
 */
export const sendPrintFiles = (id: number, files?: PrintFileUpload[]): Promise<{ ok: true }> => {
  return call<{ ok: true }>({
    rest: { path: `/admin/orders/${id}/send-print`, method: 'POST' },
    gas: { action: 'admin.orders.sendPrint', params: { id, files } },
  });
};

/** Готовый файл с Node-сервера */
export const fetchServerPrintFile = (id: number, format: PrintFileFormat): Promise<Blob> => {
  return requestRestBlob(`/admin/orders/${id}/print.${format}`);
};
