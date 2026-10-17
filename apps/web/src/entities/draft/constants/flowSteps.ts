/** Шаги оформления для индикатора: старт → ник и профиль → конструктор → оплата */
export const ORDER_FLOW_STEPS = ['Дизайн', 'Профиль', 'Плашка', 'Оплата'] as const;

/** Номер шага (с 1) для каждого экрана оформления */
export const ORDER_FLOW_STEP = {
  design: 1,
  profile: 2,
  plaque: 3,
  payment: 4,
} as const;
