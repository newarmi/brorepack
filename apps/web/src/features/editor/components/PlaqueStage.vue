<template>
  <figure class="plaque-stage">
    <div class="plaque-stage__plaque">
      <PlaquePreview :design="props.design" glow />
    </div>
    <figcaption class="plaque-stage__caption mono">{{ caption }}</figcaption>
  </figure>
</template>

<script setup lang="ts">
import type { PlaqueDesign } from '@brorepack/shared';
import { getSize } from '@brorepack/shared';
import { computed } from 'vue';

import { PlaquePreview } from '@/entities/plaque';

const props = defineProps<{ design: PlaqueDesign }>();

const caption = computed(() => {
  const size = getSize(props.design.size);
  return `${size.label} · ${size.dimensions} · акрил 3 мм`;
});
</script>

<style scoped>
.plaque-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 16px 14px;
  background:
    radial-gradient(80% 70% at 50% 42%, rgb(47 140 255 / 18%) 0%, transparent 70%),
    var(--color-surface);
  border-radius: var(--radius-card);
}

.plaque-stage__plaque {
  width: min(52%, 200px);
}

.plaque-stage__caption {
  margin-top: 18px;
  color: var(--color-faint);
  font-size: 11px;
  letter-spacing: 0.04em;
}
</style>
