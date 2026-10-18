/**
 * Черновик заказа: всё, что клиент выбрал от ника до адреса.
 * stores/draftStore — состояние; utils/storage — sessionStorage; utils/mappers — дизайн, тело заказа, цена;
 * stores/customImageStore + utils/imageStorage — своя картинка клиента на «Своём дизайне» (файл в IndexedDB);
 * constants/flowSteps — шаги оформления для индикатора на экранах.
 */

export { ORDER_FLOW_STEP, ORDER_FLOW_STEPS } from './constants/flowSteps';
export { useCustomImageStore } from './stores/customImageStore';
export { useDraftStore } from './stores/draftStore';
