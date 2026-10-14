// Имена маршрутов — в shared, потому что переходы делают и страницы, и фичи
export const ROUTE_NAMES = {
  start: 'start',
  nickname: 'nickname',
  profile: 'profile',
  constructor: 'constructor',
  checkout: 'checkout',
  orders: 'orders',
  order: 'order',
  admin: 'admin',
  adminOrder: 'admin-order',
} as const;

/** Метка «только что оплатили» в адресе экрана заказа: после неё «Назад» ведёт на старт */
export const JUST_PAID_QUERY = { paid: '1' } as const;
