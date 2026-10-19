<template>
  <figure class="plaque-stage" :class="{ 'plaque-stage--lit': props.lightStand }">
    <!-- Наклон пальцем — только украшение: без него плашка остаётся обычной картинкой.
         Плашка и подставка наклоняются вместе, как один предмет -->
    <div
      ref="product"
      class="plaque-stage__product"
      :class="{
        'plaque-stage__product--tiltable': isTiltEnabled,
        'plaque-stage__product--3d': is3dReady,
      }"
    >
      <div class="plaque-stage__plaque">
        <span class="plaque-stage__glow" aria-hidden="true" />
        <!-- Торцы акрила толщиной 5 мм: лицевая сторона вынесена вперёд, торцы видны при наклоне -->
        <PlaqueEdges />
        <div class="plaque-stage__front">
          <!-- Ключ — шаблон: смена шаблона перекрёстно растворяет плашки, правка ника перерисовывает без анимации -->
          <Transition name="plaque-swap">
            <PlaquePreview
              :key="props.design.templateId"
              :design="props.design"
              :image="props.image"
              glow
            />
          </Transition>
          <!-- Пока 3D не стало интерактивным. Лоадер — на лицевой стороне CSS-плашки: лежи он глубже,
               на iPhone его закрыла бы сама плашка (3D-слои сортируются по глубине, z-index не помогает).
               Готово 3D — лоадер прячется вместе с CSS-плашкой; 3D недоступно — убирается -->
          <PlaqueLoader v-if="is3dLoading" />
        </div>
      </div>
      <!-- Подставка всегда занимает место: при переключении меняется только прозрачность, без скачка -->
      <PlaqueStand :isLit="props.lightStand" />
      <!-- 3D из акрила поверх CSS-версии; как они сменяют друг друга — useAcrylicPreview -->
      <AcrylicPlaque3D
        v-if="!is3dFailed"
        class="plaque-stage__acrylic"
        :design="props.design"
        :image="props.image"
        :lightStand="props.lightStand"
        @ready="acrylicReadyHandler"
        @fail="acrylicFailHandler"
      />
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

import type { PlaqueDesign, PlaqueImage } from '@brorepack/shared';
import { getSize } from '@brorepack/shared';

import { AcrylicPlaque3D, PlaquePreview } from '@/entities/plaque';
import { AppIcon } from '@/shared/ui';

import { useAcrylicPreview } from '../composables/useAcrylicPreview';
import PlaqueEdges from './PlaqueEdges.vue';
import PlaqueLoader from './PlaqueLoader.vue';
import PlaqueStand from './PlaqueStand.vue';

const props = withDefaults(
  defineProps<{
    design: PlaqueDesign;
    /** Подставка с подсветкой: вокруг плашки RGB-кромка, как на фото готовых плашек */
    lightStand?: boolean;
    /** Уровень и ELO уже из FACEIT — показываем, что их не поменять */
    isRatingVisible?: boolean;
    /** Картинка клиента поверх фона; двигают её на отдельном экране — ImageEditorStage */
    image?: PlaqueImage | null;
  }>(),
  { lightStand: false, isRatingVisible: false, image: null },
);

const product = useTemplateRef<HTMLElement>('product');
const { isTiltEnabled, is3dReady, is3dFailed, acrylicReadyHandler, acrylicFailHandler } =
  useAcrylicPreview(product);

const is3dLoading = computed(() => !is3dReady.value && !is3dFailed.value);

const sizeCaption = computed(() => {
  const size = getSize(props.design.size);
  return `${size.label} · ${size.dimensions} · акрил 5 мм`;
});
</script>

<style scoped>
.plaque-stage {
  /* Камера чуть выше предмета: верх подставки виден и без наклона, плашка (z = 0) не искажается.
     Размеры самой подставки — в PlaqueStand.vue */
  --stage-perspective: 900px;
  --stage-camera-y: 5%;
  /* Толщина акрила 5 мм в масштабе плашки: её ширина (как у __plaque) × 5 / 148 мм листа.
     cqw — от ширины сцены, потому что translateZ не принимает проценты. Ширину паза берёт PlaqueStand */
  --plaque-depth: calc(min(70cqw, 268px) * 230 / 268 * 5 / 148);

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
  container-type: inline-size;
}

/* Ширина — по подставке, она шире плашки. Так область касания не выходит за предмет */
.plaque-stage__product {
  position: relative;
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

/* 3D готово: CSS-версия прячется, но продолжает держать место — вёрстка не прыгает */
.plaque-stage__product--3d > :not(.plaque-stage__acrylic) {
  visibility: hidden;
}

/* Те же размеры, что раньше относительно сцены: min(60%, 230px) = 230/268 ширины подставки */
.plaque-stage__plaque {
  position: relative;
  width: calc(100% * 230 / 268);
  transform-style: preserve-3d;
}

/* Середина толщины — в плоскости паза подставки (z = 0), лицевая сторона — на полтолщины ближе */
.plaque-stage__front {
  position: relative;
  transform: translateZ(calc(var(--plaque-depth) / 2));
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

/* RGB-кромка акрила на подставке с подсветкой */
.plaque-stage__glow {
  position: absolute;
  inset: -3px;
  z-index: -1;
  overflow: hidden;
  border-radius: 10px;
  filter: blur(6px);
  opacity: 0;
  /* Свет идёт из-за плашки: свечение — у задней стороны */
  transform: translateZ(calc(var(--plaque-depth) / -2));
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

/* У 3D своя кромка: скрытая CSS-кромка иначе крутилась бы впустую, перерисовывая размытие каждый кадр */
.plaque-stage__product--3d .plaque-stage__glow::before {
  animation-play-state: paused;
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
