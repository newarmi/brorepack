/**
 * Оформление заказа.
 * useCheckout: useCheckoutValidation → obtainInvoice (новый или неоплаченный заказ)
 * → оплата из entities/payment → useCheckoutOutcome (куда перейти после оплаты).
 * Адрес: одно поле AddressField → useAddressSearch → api/geocoder (Photon, VITE_GEOCODER_URL):
 * выбранный вариант даёт полный адрес, город и координаты. «Ввести вручную» (или геокодер не настроен) —
 * адрес как написан, без города и координат.
 */

export { default as DeliveryFields } from './components/DeliveryFields.vue';
export { default as RecipientFields } from './components/RecipientFields.vue';
export { useCheckout } from './composables/useCheckout';
export { usePhoneFromTelegram } from './composables/usePhoneFromTelegram';
