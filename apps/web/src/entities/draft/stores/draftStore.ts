import { computed, reactive, toRefs, watch } from 'vue';
import { defineStore } from 'pinia';

import type { FaceitProfile } from '@brorepack/shared';

import type { DraftState } from '../types/draft';
import { buildDraftDesign, buildOrderInput, calcDraftPrice } from '../utils/mappers';
import { getDefaultDraftState, readDraftState, writeDraftState } from '../utils/storage';
import { useCustomImageStore } from './customImageStore';

export const useDraftStore = defineStore('draft', () => {
  const state = reactive<DraftState>(readDraftState());

  watch(state, (value) => writeDraftState(value), { deep: true });

  const hasProfile = computed(() => state.profile !== null);
  const design = computed(() => buildDraftDesign(state));
  const orderInput = computed(() => buildOrderInput(state));

  /** Плашка с допами, без доставки — для экрана конструктора */
  const plaquePrice = computed(() => calcDraftPrice(state, false));
  const orderPrice = computed(() => calcDraftPrice(state, true));

  const orderSignature = computed(() => JSON.stringify(orderInput.value));

  /** id неоплаченного заказа, если черновик с тех пор не менялся */
  const pendingOrderId = computed(() => {
    const { pendingOrder } = state;
    return pendingOrder?.signature === orderSignature.value ? pendingOrder.id : null;
  });

  /** Новый игрок или пустая надпись → надпись по умолчанию = ник */
  const setProfile = (profile: FaceitProfile): void => {
    const previous = state.profile;
    const isSamePlayer =
      previous?.playerId === profile.playerId &&
      previous.level === profile.level &&
      previous.elo === profile.elo;

    state.profile = profile;
    state.nickname = profile.nickname;
    if (!isSamePlayer || !state.displayName.trim()) {
      state.displayName = profile.nickname;
    }
  };

  const rememberPendingOrder = (id: number): void => {
    state.pendingOrder = { id, signature: orderSignature.value };
  };

  const reset = (): void => {
    useCustomImageStore().removeImage();
    Object.assign(state, getDefaultDraftState());
  };

  return {
    ...toRefs(state),
    hasProfile,
    design,
    plaquePrice,
    orderPrice,
    orderInput,
    pendingOrderId,
    setProfile,
    rememberPendingOrder,
    reset,
  };
});
