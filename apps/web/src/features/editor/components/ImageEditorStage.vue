<template>
  <!-- Жест слушается на всей области: на телефоне не нужно целиться пальцами в плашку -->
  <div ref="stage" class="image-stage">
    <div ref="frame" class="image-stage__frame">
      <!-- Та же картинка за плашкой, полупрозрачная: видно, какая часть обрежется краем -->
      <img
        v-if="props.image"
        class="image-stage__photo image-stage__photo--overflow"
        :src="props.image.href"
        :style="photoStyle"
        alt=""
        draggable="false"
      />
      <!-- Плашка в три слоя: фон и арт, картинка клиента, знак FACEIT с ником. SVG-слои рисуются один раз,
           а картинка двигается CSS-трансформацией на видеокарте — на iPhone иначе каждый кадр жеста
           перерисовывал бы весь SVG плашки и картинка шла за пальцем рывками -->
      <div class="image-stage__plaque">
        <PlaquePreview :design="props.design" layer="back" decorative />
        <div v-if="props.image" class="image-stage__clip">
          <img class="image-stage__photo" :src="props.image.href" :style="photoStyle" alt="" draggable="false" />
        </div>
        <PlaquePreview class="image-stage__front" :design="props.design" layer="front" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';

import type { PlaqueDesign, PlaqueImage, PlaqueImageTransform } from '@brorepack/shared';

import { PlaquePreview } from '@/entities/plaque';

import { useImageGesture } from '../composables/useImageGesture';
import { getFitScale } from '../utils/imageTransform';

const emits = defineEmits<{ transformImage: [transform: PlaqueImageTransform] }>();

const props = defineProps<{
  design: PlaqueDesign;
  image: PlaqueImage | null;
}>();

const stage = useTemplateRef<HTMLElement>('stage');
const frame = useTemplateRef<HTMLElement>('frame');

useImageGesture(
  { target: stage, frame },
  () => props.image,
  (transform) => emits('transformImage', transform),
);

// Тот же порядок, что в renderPlaqueSvg: центр → поворот → масштаб, только в пунктах листа (--pt).
// Размер элемента — картинка «на 100 %»: он не меняется при жесте, поэтому нет пересчёта раскладки,
// а растровая копия слоя на видеокарте остаётся размером с плашку, а не с исходный файл
const photoStyle = computed(() => {
  if (!props.image) {
    return {};
  }
  const { width, height, x, y, scale, rotation } = props.image;
  const fitScale = getFitScale(props.image);
  return {
    width: `calc(var(--pt) * ${width * fitScale})`,
    height: `calc(var(--pt) * ${height * fitScale})`,
    transform: `translate(calc(var(--pt) * ${x}), calc(var(--pt) * ${y})) rotate(${rotation}deg) scale(${scale / fitScale}) translate(-50%, -50%)`,
  };
});
</script>

<style scoped>
/* container-type: size — плашка вписывается и по ширине, и по высоте свободного места (единицы cqw/cqh) */
.image-stage {
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: hidden;
  container-type: size;
  cursor: move;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* Поля вокруг плашки — чтобы был виден полупрозрачный край картинки, который обрежется */
/* Палец всегда попадает в саму сцену, а не в SVG внутри: iOS не захватывает касание узлом плашки
   и не начинает системное перетаскивание картинки (pointercancel посреди жеста) */
/* --pt — пункт листа: ширина рамки соответствует ширине плашки в renderPlaqueSvg (419.5276 pt) */
.image-stage__frame {
  --pt: calc(100cqw / 419.5276);

  position: relative;
  width: min(86cqw, 92cqh * 148 / 210);
  container-type: inline-size;
  pointer-events: none;
}

.image-stage__photo {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: 0 0;
  will-change: transform;
}

.image-stage__photo--overflow {
  opacity: 0.35;
}

.image-stage__plaque {
  position: relative;
  box-shadow: 0 0 0 1px var(--color-line-strong);
  border-radius: 1.9% / 1.35%;
}

/* Обрезка по скруглённой плашке — та же, что clipPath в renderPlaqueSvg */
.image-stage__clip {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 1.9% / 1.35%;
}

.image-stage__front {
  position: absolute;
  inset: 0;
}
</style>
