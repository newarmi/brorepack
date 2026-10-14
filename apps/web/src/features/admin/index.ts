/**
 * Кабинет администратора.
 * Список: useAdminOrders (фильтр в query + опрос раз в 30 с).
 * Карточка: useOrderStatusEditor — статус и трек-номер; usePrintFiles → print/ — файлы для печати.
 */

export { default as AdminOrderDetails } from './components/AdminOrderDetails.vue';
export { default as AdminStatusControl } from './components/AdminStatusControl.vue';
export { default as PrintFilesPanel } from './components/PrintFilesPanel.vue';
export { default as StatusFilter } from './components/StatusFilter.vue';
export { useAdminOrders } from './composables/useAdminOrders';
export { useOrderStatusEditor } from './composables/useOrderStatusEditor';
