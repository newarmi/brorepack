import type { CreateOrderInput, PlaqueDesign, PriceBreakdown } from '@brorepack/shared';
import { calcPrice, DEFAULT_SIZE, getDefaultCaption } from '@brorepack/shared';

import type { DraftState } from '../types/draft';

// Уровень, ELO и подпись с ними — только из профиля FACEIT; сервер при заказе пересчитает их сам
export const buildDraftDesign = (state: DraftState): PlaqueDesign => {
  const level = state.profile?.level ?? 1;
  const elo = state.profile?.elo ?? 0;
  return {
    templateId: state.templateId,
    size: DEFAULT_SIZE,
    displayName: state.displayName.trim(),
    caption: state.profile ? getDefaultCaption(level, elo) : '',
    level,
    elo,
  };
};

/** Тело POST /api/orders; валидируется createOrderInputSchema на экране оформления */
export const buildOrderInput = (state: DraftState): CreateOrderInput => {
  const comment = state.comment.trim();
  const isCustomDesign = state.templateId === 'custom';
  return {
    nickname: state.profile?.nickname ?? state.nickname,
    design: {
      templateId: state.templateId,
      size: DEFAULT_SIZE,
      displayName: state.displayName,
    },
    extras: { lightStand: state.lightStand },
    delivery: { ...state.delivery },
    recipient: { ...state.recipient },
    comment: isCustomDesign && comment ? comment : undefined,
  };
};

/** Цена из черновика; без доставки — для экрана конструктора, где адреса ещё нет */
export const calcDraftPrice = (state: DraftState, isDeliveryIncluded: boolean): PriceBreakdown => {
  return calcPrice({
    templateId: state.templateId,
    size: DEFAULT_SIZE,
    extras: { lightStand: state.lightStand },
    deliveryMethod: isDeliveryIncluded ? state.delivery.method : undefined,
  });
};
