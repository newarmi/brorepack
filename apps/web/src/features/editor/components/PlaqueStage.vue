<template>
  <figure class="plaque-stage" :class="{ 'plaque-stage--lit': props.lightStand }">
    <div class="plaque-stage__plaque">
      <PlaquePreview :design="props.design" glow />
      <span v-if="isCustom" class="plaque-stage__sketch">Эскиз · макет нарисует дизайнер</span>
    </div>
    <span v-if="props.lightStand" class="plaque-stage__stand" aria-hidden="true" />
    <figcaption class="plaque-stage__caption">
      <span class="plaque-stage__size mono">{{ sizeCaption }}</span>
      <span v-if="props.isRatingVisible" class="plaque-stage__rating">
        <AppIcon name="check" :size="14" />
        <span class="mono">{{ props.design.level }} lvl · {{ props.design.elo }} elo</span>
        — из FACEIT, изменить нельзя
      </span>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { PlaqueDesign } from '@brorepack/shared';
import { getSize } from '@brorepack/shared';

import { CUSTOM_TEMPLATE_ID, PlaquePreview } from '@/entities/plaque';
import { AppIcon } from '@/shared/ui';

const props = withDefaults(
  defineProps<{
    design: PlaqueDesign;
    /** Подставка с подсветкой: вокруг плашки RGB-кромка, как на фото готовых плашек */
    lightStand?: boolean;
    /** Уровень и ELO уже из FACEIT — показываем, что их не поменять */
    isRatingVisible?: boolean;
  }>(),
  { lightStand: false, isRatingVisible: false },
);

const isCustom = computed(() => props.design.templateId === CUSTOM_TEMPLATE_ID);

const sizeCaption = computed(() => {
  const size = getSize(props.design.size);
  return `${size.label} · ${size.dimensions} · акрил 3 мм`;
});
</script>

<style scoped>
.plaque-stage {
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 16px 16px;
  overflow: hidden;
  background: linear-gradient(180deg, #2e2e2e 0%, #0b0b0b 100%);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-card);
}

.plaque-stage__plaque {
  position: relative;
  width: min(60%, 230px);
}

.plaque-stage__sketch {
  position: absolute;
  top: 50%;
  left: 50%;
  padding: 6px 10px;
  border: 1px dashed var(--color-accent);
  border-radius: var(--radius-chip);
  background: rgb(11 11 11 / 85%);
  color: var(--color-text);
  font-size: var(--text-xs);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  transform: translate(-50%, -50%);
}

/* RGB-кромка акрила на подставке с подсветкой */
.plaque-stage--lit .plaque-stage__plaque::after {
  content: '';
  position: absolute;
  inset: -3px;
  z-index: -1;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff2d55, #ff9500, #ffd60a, #30d158, #0a84ff, #bf5af2, #ff2d55);
  background-size: 300% 300%;
  filter: blur(6px);
  animation: plaque-stage-rgb 6s linear infinite;
}

.plaque-stage__stand {
  width: min(70%, 268px);
  height: 14px;
  margin-top: -2px;
  border-radius: 4px 4px 8px 8px;
  background: linear-gradient(180deg, #2a2a2a, #111);
  box-shadow:
    0 -2px 12px rgb(255 255 255 / 25%),
    inset 0 1px 0 rgb(255 255 255 / 15%);
}

.plaque-stage__caption {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  text-align: center;
}

.plaque-stage__size {
  color: var(--color-faint);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.plaque-stage__rating {
  color: var(--color-muted);
  font-size: var(--text-sm);
}

.plaque-stage__rating :deep(svg) {
  display: inline-block;
  margin-right: 4px;
  color: var(--color-ok);
  vertical-align: -2px;
}

.plaque-stage__rating .mono {
  color: var(--color-text);
  font-weight: 700;
}

@keyframes plaque-stage-rgb {
  to {
    background-position: 300% 300%;
  }
}
</style>
