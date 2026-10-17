/**
 * Черновик заказа: всё, что клиент выбрал от ника до адреса.
 * stores/draftStore — состояние; utils/storage — sessionStorage; utils/mappers — дизайн, тело заказа, цена;
 * constants/flowSteps — шаги оформления для индикатора на экранах.
 */

export { ORDER_FLOW_STEP, ORDER_FLOW_STEPS } from './constants/flowSteps';
export { useDraftStore } from './stores/draftStore';
