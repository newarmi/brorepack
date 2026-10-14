/** Чем закончилась оплата. paid/cancelled/failed/pending приходят из Telegram openInvoice */
export const PAYMENT_STATUS = {
  paid: 'paid',
  cancelled: 'cancelled',
  failed: 'failed',
  pending: 'pending',
  /** Оплата через Telegram недоступна: приложение открыто не в Telegram */
  unavailable: 'unavailable',
} as const;
