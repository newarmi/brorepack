import type { Order } from '@brorepack/shared';
import { getDeliveryMethod, getSize, getTemplate, LIGHT_STAND } from '@brorepack/shared';

import { formatDateTime } from '@/shared/lib';

import type { DetailsItem } from '../types/details';

export const getDesignDetails = (order: Order): DetailsItem[] => {
  const { design } = order;
  const size = getSize(design.size);
  const items: DetailsItem[] = [
    { label: 'Шаблон', value: getTemplate(design.templateId).name },
    { label: 'Размер', value: `${size.label} · ${size.dimensions}` },
    { label: 'Надпись', value: design.displayName, selectable: true },
    { label: 'Подпись', value: design.caption || '—', selectable: true },
    { label: 'Уровень', value: `${design.level} lvl · ${design.elo} ELO` },
    { label: 'FACEIT', value: order.faceitNickname, selectable: true },
    { label: LIGHT_STAND.label, value: order.extras.lightStand ? 'Да' : 'Нет' },
  ];
  if (order.comment) {
    items.push({ label: 'Пожелания', value: order.comment, selectable: true });
  }
  return items;
};

export const getRecipientDetails = (order: Order): DetailsItem[] => {
  return [
    { label: 'Имя', value: order.recipient.name, selectable: true },
    { label: 'Телефон', value: order.recipient.phone, selectable: true },
  ];
};

export const getDeliveryDetails = (order: Order): DetailsItem[] => {
  const method = getDeliveryMethod(order.delivery.method);
  const items: DetailsItem[] = [
    { label: 'Способ', value: `${method.label} · ${method.eta}` },
    { label: 'Город', value: order.delivery.city, selectable: true },
    { label: 'Адрес', value: order.delivery.address, selectable: true },
  ];
  if (order.trackingNumber) {
    items.push({ label: 'Трек-номер', value: order.trackingNumber, selectable: true });
  }
  return items;
};

export const getCustomerDetails = (order: Order): DetailsItem[] => {
  const items: DetailsItem[] = [
    { label: 'Имя', value: order.customer.firstName },
    { label: 'Telegram id', value: String(order.customer.telegramId), selectable: true },
    { label: 'Создан', value: formatDateTime(order.createdAt) },
  ];
  if (order.paidAt) {
    items.push({ label: 'Оплачен', value: formatDateTime(order.paidAt) });
  }
  return items;
};
