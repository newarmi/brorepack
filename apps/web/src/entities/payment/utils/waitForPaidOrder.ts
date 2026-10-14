import type { Order } from '@brorepack/shared';

import { fetchOrder, ORDER_STATUS } from '@/entities/order';
import { sleep } from '@/shared/lib';

const CONFIRM_POLL_INTERVAL_MS = 1500;
const CONFIRM_TIMEOUT_MS = 20_000;

/** После openInvoice → 'paid' ждём, пока бот получит successful_payment и сменит статус */
export const waitForPaidOrder = async (orderId: number): Promise<Order | null> => {
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
  let latest: Order | null = null;
  while (Date.now() < deadline) {
    await sleep(CONFIRM_POLL_INTERVAL_MS);
    try {
      latest = await fetchOrder(orderId);
    } catch {
      // Сеть моргнула — пробуем ещё раз до таймаута
      continue;
    }
    if (latest.status !== ORDER_STATUS.awaitingPayment) {
      return latest;
    }
  }
  return latest;
};
