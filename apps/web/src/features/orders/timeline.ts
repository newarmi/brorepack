import type { Order, OrderStatus } from '@brorepack/shared';
import { ORDER_STATUS_LABELS, ORDER_TIMELINE } from '@brorepack/shared';

import { ORDER_STATUS } from '@/entities/order/constants';
import { formatDateTime } from '@/shared/lib/format';

export type TimelineOrder = Pick<Order, 'status' | 'paidAt' | 'trackingNumber'>;

export type StepState = 'done' | 'current' | 'todo';

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  state: StepState;
  note: string | null;
  isNoteAccent: boolean;
}

interface StepNote {
  text: string;
  isAccent: boolean;
}

/**
 * Какой шаг сейчас «в работе». «Оплачен» — событие, а не процесс: после оплаты
 * в работе уже следующий шаг (печать). «Получен» — финал, всё выполнено.
 */
const getActiveStepIndex = (status: OrderStatus): number => {
  const activeIndexByStatus: Partial<Record<OrderStatus, number>> = {
    [ORDER_STATUS.awaitingPayment]: 0,
    [ORDER_STATUS.paid]: 1,
    [ORDER_STATUS.delivered]: ORDER_TIMELINE.length,
  };
  return activeIndexByStatus[status] ?? ORDER_TIMELINE.indexOf(status);
};

const getStepState = (index: number, activeIndex: number): StepState => {
  if (index < activeIndex) {
    return 'done';
  }
  return index === activeIndex ? 'current' : 'todo';
};

// Подсказка под шагом: у каждого шага своя, зависит от заказа и состояния шага
const STEP_NOTES: Partial<
  Record<OrderStatus, (order: TimelineOrder, state: StepState) => StepNote | null>
> = {
  [ORDER_STATUS.paid]: (order, state) => {
    if (state === 'done' && order.paidAt) {
      return { text: formatDateTime(order.paidAt), isAccent: false };
    }
    return state === 'current'
      ? { text: 'после оплаты сразу начнём работу', isAccent: true }
      : null;
  },
  [ORDER_STATUS.printing]: (order, state) => {
    if (state !== 'current') {
      return null;
    }
    const isJustPaid = order.status === ORDER_STATUS.paid;
    return { text: isJustPaid ? 'скоро возьмём в печать' : 'обычно 1–2 дня', isAccent: true };
  },
  [ORDER_STATUS.shipped]: (order, state) => {
    if (!order.trackingNumber) {
      return { text: 'здесь появится трек-номер СДЭК', isAccent: false };
    }
    return { text: `трек-номер СДЭК: ${order.trackingNumber}`, isAccent: state === 'current' };
  },
};

// Пока заказ не оплачен, первый шаг называется «Ждёт оплаты», а не «Оплачен»
const getStepLabel = (stepStatus: OrderStatus, order: TimelineOrder): string => {
  const isAwaitingPayment =
    stepStatus === ORDER_STATUS.paid && order.status === ORDER_STATUS.awaitingPayment;
  return ORDER_STATUS_LABELS[isAwaitingPayment ? ORDER_STATUS.awaitingPayment : stepStatus];
};

export const buildTimelineSteps = (order: TimelineOrder): TimelineStep[] => {
  const activeIndex = getActiveStepIndex(order.status);
  return ORDER_TIMELINE.map((status, index) => {
    const state = getStepState(index, activeIndex);
    const note = STEP_NOTES[status]?.(order, state) ?? null;
    return {
      status,
      label: getStepLabel(status, order),
      state,
      note: note?.text ?? null,
      isNoteAccent: note?.isAccent ?? false,
    };
  });
};
