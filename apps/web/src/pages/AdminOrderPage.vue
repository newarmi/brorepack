<template>
  <div class="admin-order-page">
    <AsyncState
      :status="status"
      errorTitle="Не получилось загрузить заказ"
      :errorText="error?.message"
      @retry="reload"
    >
      <template #loading>
        <div class="admin-order-page__stack" aria-busy="true" aria-label="Загружаем заказ">
          <SkeletonBlock width="60%" height="28px" />
          <SkeletonBlock height="320px" radius="20px" />
          <SkeletonBlock height="200px" radius="20px" />
        </div>
      </template>

      <div v-if="order" class="admin-order-page__stack">
        <header class="admin-order-page__header">
          <h1 class="page-title">Заказ №{{ order.number }}</h1>
          <StatusPill :status="order.status" />
        </header>

        <div class="admin-order-page__preview">
          <PlaquePreview :design="order.design" glow />
        </div>

        <AdminStatusControl v-model:status="statusDraft" v-model:trackingNumber="trackingDraft" />

        <PrintFilesPanel :order="order" />

        <AdminOrderDetails :order="order" />

        <PriceTotals :lines="order.price.lines" :total="order.price.total" />
      </div>
    </AsyncState>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import PriceTotals from '@/entities/order/PriceTotals.vue';
import StatusPill from '@/entities/order/StatusPill.vue';
import { useOrder } from '@/entities/order/useOrder';
import PlaquePreview from '@/entities/plaque/PlaquePreview.vue';
import AdminOrderDetails from '@/features/admin/AdminOrderDetails.vue';
import AdminStatusControl from '@/features/admin/AdminStatusControl.vue';
import PrintFilesPanel from '@/features/admin/PrintFilesPanel.vue';
import { useOrderStatusEditor } from '@/features/admin/useOrderStatusEditor';
import { useMainButton } from '@/shared/telegram/useMainButton';
import AsyncState from '@/shared/ui/AsyncState.vue';
import SkeletonBlock from '@/shared/ui/SkeletonBlock.vue';

const route = useRoute();

const orderId = computed(() => Number(route.params.id));
const { order, status, error, reload, setOrder } = useOrder(orderId);
const { statusDraft, trackingDraft, isDirty, isSaving, save } = useOrderStatusEditor(
  order,
  setOrder,
);

// В админке MainButton — «Сохранить», появляется только при несохранённых изменениях
useMainButton({
  text: 'Сохранить статус',
  visible: () => status.value === 'ready' && isDirty.value,
  loading: isSaving,
  onClick: () => void save(),
});
</script>

<style scoped>
.admin-order-page__stack {
  display: grid;
  gap: 16px;
}

.admin-order-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.admin-order-page__preview {
  width: min(62%, 240px);
  margin: 8px auto 12px;
}
</style>
