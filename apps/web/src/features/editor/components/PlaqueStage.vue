<template>
  <figure class="plaque-stage" :class="{ 'plaque-stage--lit': props.lightStand }">
    <!-- Наклон пальцем — только украшение: без него плашка остаётся обычной картинкой.
         Плашка и подставка наклоняются вместе, как один предмет -->
    <div
      ref="product"
      class="plaque-stage__product"
      :class="{ 'plaque-stage__product--tiltable': isTiltEnabled }"
    >
      <div class="plaque-stage__plaque">
        <span class="plaque-stage__glow" aria-hidden="true" />
        <!-- Ключ — шаблон: смена шаблона перекрёстно растворяет плашки, правка ника перерисовывает без анимации -->
        <Transition name="plaque-swap">
          <PlaquePreview :key="props.design.templateId" :design="props.design" glow />
        </Transition>
        <span v-if="isCustom" class="plaque-stage__sketch">Эскиз · макет нарисует дизайнер</span>
      </div>
      <!-- Подставка всегда занимает место: при переключении меняется только прозрачность, без скачка -->
      <PlaqueStand :isLit="props.lightStand" />
    </div>
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
import { computed, useTemplateRef } from 'vue';

import type { PlaqueDesign } from '@brorepack/shared';
import { getSize } from '@brorepack/shared';

import { CUSTOM_TEMPLATE_ID, PlaquePreview } from '@/entities/plaque';
import { AppIcon } from '@/shared/ui';

import { usePointerTilt } from '../composables/usePointerTilt';
import PlaqueStand from './PlaqueStand.vue';

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

const product = useTemplateRef<HTMLElement>('product');
const { isTiltEnabled } = usePointerTilt(product);

const isCustom = computed(() => props.design.templateId === CUSTOM_TEMPLATE_ID);

const sizeCaption = computed(() => {
  const size = getSize(props.design.size);
  return `${size.label} · ${size.dimensions} · акрил 3 мм`;
});
</script>

<style scoped>
.plaque-stage {
  /* Камера чуть выше предмета: верх подставки виден и без наклона, плашка (z = 0) не искажается.
     Размеры самой подставки — в PlaqueStand.vue */
  --stage-perspective: 900px;
  --stage-camera-y: 5%;

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
  perspective: var(--stage-perspective);
  perspective-origin: 50% var(--stage-camera-y);
}

/* Ширина — по подставке, она шире плашки. Так область касания не выходит за предмет */
.plaque-stage__product {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(70%, 268px);
  transform-style: preserve-3d;
}

/* touch-action: none — только на предмете и только когда наклон работает: свайп мимо него прокручивает страницу */
.plaque-stage__product--tiltable {
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  will-change: transform;
}

.plaque-stage__product--tiltable:active {
  cursor: grabbing;
}

/* Те же размеры, что раньше относительно сцены: min(60%, 230px) = 230/268 ширины подставки */
.plaque-stage__plaque {
  position: relative;
  width: calc(100% * 230 / 268);
}

.plaque-swap-enter-active,
.plaque-swap-leave-active {
  transition:
    opacity 280ms ease,
    transform 280ms ease;
}

/* Уходящая плашка ложится поверх новой, чтобы блок не вырастал вдвое на время перехода */
.plaque-swap-leave-active {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.plaque-swap-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.plaque-swap-leave-to {
  opacity: 0;
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
.plaque-stage__glow {
  position: absolute;
  inset: -3px;
  z-index: -1;
  overflow: hidden;
  border-radius: 10px;
  filter: blur(6px);
  opacity: 0;
  transition: opacity 300ms ease;
}

/* Цвета бегут по кромке за счёт вращения (transform): анимация идёт на GPU, без перерисовки каждый кадр.
   Квадрат больше диагонали плашки, чтобы при любом угле закрывать её целиком */
.plaque-stage__glow::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 180%;
  aspect-ratio: 1;
  background: conic-gradient(#ff2d55, #ff9500, #ffd60a, #30d158, #0a84ff, #bf5af2, #ff2d55);
  transform: translate(-50%, -50%);
  animation: plaque-stage-rgb 6s linear infinite paused;
}

.plaque-stage--lit .plaque-stage__glow {
  opacity: 1;
}

.plaque-stage--lit .plaque-stage__glow::before {
  animation-play-state: running;
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

/* Глобальное правило сокращает анимации до 1ms — бесконечное вращение мерцало бы, поэтому отключаем его */
@media (prefers-reduced-motion: reduce) {
  .plaque-stage__glow::before {
    animation: none;
  }
}

@keyframes plaque-stage-rgb {
  to {
    transform: translate(-50%, -50%) rotate(1turn);
  }
}
</style>
