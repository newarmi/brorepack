import type { DeliveryMethod, FaceitProfile, TemplateId } from '@brorepack/shared';

/** Всё, что клиент выбрал до оплаты: от ника до адреса доставки */
export interface DraftState {
  nickname: string;
  profile: FaceitProfile | null;
  templateId: TemplateId;
  displayName: string;
  lightStand: boolean;
  delivery: { method: DeliveryMethod; city: string; address: string };
  recipient: { name: string; phone: string };
  comment: string;
  /** Заказ, созданный из этого черновика, но ещё не оплаченный — чтобы не плодить дубли */
  pendingOrder: { id: number; signature: string } | null;
}
