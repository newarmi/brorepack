/**
 * Заказ: API заказов, загрузка заказа (useOrder), статусы и общие карточки заказа.
 * Используется в оформлении, на экранах заказов и в админке.
 */

export type { InvoiceResponse } from './api/orders';
export {
  createOrder,
  createOrderInvoice,
  fetchMyOrders,
  fetchOrder,
  mockPayOrder,
} from './api/orders';
export { default as OrderListItem } from './components/OrderListItem.vue';
export { default as OrderSummaryCard } from './components/OrderSummaryCard.vue';
export { default as PriceTotals } from './components/PriceTotals.vue';
export { default as StatusPill } from './components/StatusPill.vue';
export { useOrder } from './composables/useOrder';
export { DELIVERY_METHOD } from './constants/deliveryMethod';
export { ORDER_STATUS } from './constants/orderStatus';
