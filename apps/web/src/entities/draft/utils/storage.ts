import { DELIVERY_METHOD_IDS, normalizeTemplateId } from '@brorepack/shared';

import { DELIVERY_METHOD } from '@/entities/order';
import { isOneOf } from '@/shared/lib';

import type { CustomImagePlacement } from '../types/customImage';
import type { DraftState } from '../types/draft';

// v2: формат только A5, подпись с рейтингом больше не редактируется — старые черновики не подхватываем
const STORAGE_KEY = 'brorepack:draft:v2';
// Положение своей картинки — отдельно: жест пишет его каждый кадр, весь черновик сериализовать незачем
const IMAGE_PLACEMENT_KEY = 'brorepack:custom-image:v1';

export const getDefaultDraftState = (): DraftState => {
  return {
    nickname: '',
    profile: null,
    templateId: 'graphite',
    displayName: '',
    lightStand: false,
    delivery: {
      method: DELIVERY_METHOD.cdekPickupPoint,
      city: '',
      address: '',
      location: null,
      isManualAddress: false,
    },
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

export const readImagePlacement = (): CustomImagePlacement | null => {
  try {
    const raw = sessionStorage.getItem(IMAGE_PLACEMENT_KEY);
    return raw ? (JSON.parse(raw) as CustomImagePlacement) : null;
  } catch {
    return null;
  }
};

export const writeImagePlacement = (placement: CustomImagePlacement | null): void => {
  try {
    if (placement) {
      sessionStorage.setItem(IMAGE_PLACEMENT_KEY, JSON.stringify(placement));
      return;
    }
    sessionStorage.removeItem(IMAGE_PLACEMENT_KEY);
  } catch {
    // sessionStorage недоступен — положение не переживёт перезагрузку
  }
};
