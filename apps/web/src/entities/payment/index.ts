/**
 * Оплата заказа: Telegram Payments или тестовая шторка (PAYMENTS_MODE=mock).
 * useOrderPayment → useMockPayment / openInvoice → waitForPaidOrder.
 * notifyPayment — общая реакция на исход оплаты (вибрация, тост).
 */

export { default as MockPaySheet } from './components/MockPaySheet.vue';
export { useOrderPayment } from './composables/useOrderPayment';
export { PAYMENT_STATUS } from './constants/paymentStatus';
export type { PaymentOutcome, PaymentStatus } from './types/payment';
export { notifyPaymentError, notifyPaymentOutcome } from './utils/notifyPayment';
