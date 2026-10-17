import { DELIVERY_METHOD_IDS, normalizeTemplateId } from '@brorepack/shared';

import { DELIVERY_METHOD } from '@/entities/order';
import { isOneOf } from '@/shared/lib';

import type { DraftState } from '../types/draft';

// v2: формат только A5, подпись с рейтингом больше не редактируется — старые черновики не подхватываем
const STORAGE_KEY = 'brorepack:draft:v2';

export const getDefaultDraftState = (): DraftState => {
  return {
    nickname: '',
    profile: null,
    templateId: 'graphite',
    displayName: '',
    lightStand: false,
    delivery: { method: DELIVERY_METHOD.cdekPickupPoint, city: '', address: '' },
    recipient: { name: '', phone: '' },
    comment: '',
    pendingOrder: null,
  };
};

/** Сохранённый черновик поверх значений по умолчанию; старый шаблон переводим в новый, неизвестные шаблон и доставку отбрасываем */
const mergeWithDefaults = (stored: Partial<DraftState>): DraftState => {
  const defaults = getDefaultDraftState();
  const storedMethod = stored.delivery?.method;
  return {
    ...defaults,
    ...stored,
    templateId: normalizeTemplateId(stored.templateId) ?? defaults.templateId,
    delivery: {
      ...defaults.delivery,
      ...stored.delivery,
      method: isOneOf(DELIVERY_METHOD_IDS, storedMethod) ? storedMethod : defaults.delivery.method,
    },
    recipient: { ...defaults.recipient, ...stored.recipient },
  };
};

export const readDraftState = (): DraftState => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? mergeWithDefaults(JSON.parse(raw) as Partial<DraftState>) : getDefaultDraftState();
  } catch {
    return getDefaultDraftState();
  }
};

export const writeDraftState = (state: DraftState): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage может быть недоступен (приватный режим) — черновик просто не переживёт перезагрузку
  }
};
