/**
 * Оформление заказа.
 * useCheckout: useCheckoutValidation → obtainInvoice (новый или неоплаченный заказ)
 * → оплата из entities/payment → useCheckoutOutcome (куда перейти после оплаты).
 */

export { default as DeliveryFields } from './components/DeliveryFields.vue';
export { default as RecipientFields } from './components/RecipientFields.vue';
export { useCheckout } from './composables/useCheckout';
export { usePhoneFromTelegram } from './composables/usePhoneFromTelegram';
