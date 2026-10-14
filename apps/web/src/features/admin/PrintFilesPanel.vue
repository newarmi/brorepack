<template>
  <div class="print-files">
    <AppButton icon="send" block :loading="isSendingPrint" @click="sendPrint">
      Прислать файл для печати в чат
    </AppButton>
    <div class="print-files__downloads">
      <AppButton
        variant="link"
        :loading="downloadingFormat === 'svg'"
        @click="downloadPrint('svg')"
      >
        Скачать SVG
      </AppButton>
      <AppButton
        variant="link"
        :loading="downloadingFormat === 'png'"
        @click="downloadPrint('png')"
      >
        Скачать PNG 300 dpi
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Order } from '@brorepack/shared';

import AppButton from '@/shared/ui/AppButton.vue';

import { usePrintFiles } from './usePrintFiles';

const props = defineProps<{ order: Order }>();

const { isSendingPrint, downloadingFormat, sendPrint, downloadPrint } = usePrintFiles(
  () => props.order,
);
</script>

<style scoped>
.print-files__downloads {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
</style>
