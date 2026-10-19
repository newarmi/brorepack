<template>
  <!-- Место предмета в вёрстке: холст внутри него шире и выше, чтобы при повороте ничего не обрезалось.
       Пока 3D не готово, касания проходят насквозь — к CSS-версии под ним -->
  <div
    ref="host"
    class="acrylic-plaque"
    :class="{ 'acrylic-plaque--ready': isReady }"
    :style="overflowStyle"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue';

import type { PlaqueDesign, PlaqueImage } from '@brorepack/shared';
import { getTemplate } from '@brorepack/shared';

import type { AcrylicView } from './acrylicView';
import type { AcrylicQuality } from './config';
import { CANVAS_OVERFLOW, DESIGN_TEXTURE } from './config';
import { checkWebGLForced, getAutoQuality } from './quality';

const emits = defineEmits<{
  /** Первый кадр с дизайном нарисован — CSS-версию можно прятать */
  ready: [];
  /** Нет WebGPU и WebGL 2, не загрузился чанк или потерян GPU-контекст — нужна CSS-версия */
  fail: [];
}>();

const props = withDefaults(
  defineProps<{
    design: PlaqueDesign;
    image?: PlaqueImage | null;
    /** Подставка с подсветкой: видна подставка и бегущая RGB-кромка */
    lightStand?: boolean;
    /** Без значения — по устройству (getAutoQuality) */
    quality?: AcrylicQuality;
  }>(),
  { image: null, lightStand: false, quality: undefined },
);

const host = useTemplateRef<HTMLElement>('host');
const isReady = shallowRef(false);
const glowColor = computed(() => getTemplate(props.design.templateId).glowColor);

// Те же запасы, по которым acrylicView считает размер кадра — числа в одном месте, в config.ts
const overflowStyle = {
  '--overflow-x': `${CANVAS_OVERFLOW.x * 100}%`,
  '--overflow-y': `${CANVAS_OVERFLOW.y * 100}%`,
};

let view: AcrylicView | null = null;
let isUnmounted = false;
let designTimer: ReturnType<typeof setTimeout> | null = null;

const failHandler = (): void => {
  if (!isUnmounted) {
    emits('fail');
  }
};

const updateDesign = async (): Promise<void> => {
  if (!view) {
    return;
  }
  await view.setDesign({ design: props.design, image: props.image });
  if (!isReady.value && !isUnmounted) {
    isReady.value = true;
    emits('ready');
  }
};

// Ник печатают по букве — перерисовываем текстуру, когда ввод затих
const scheduleDesignUpdate = (): void => {
  if (designTimer !== null) {
    clearTimeout(designTimer);
  }
  designTimer = setTimeout(() => {
    designTimer = null;
    updateDesign().catch(failHandler);
  }, DESIGN_TEXTURE.debounceMs);
};

onMounted(async () => {
  const element = host.value;
  if (!element) {
    return;
  }
  try {
    // Three.js — отдельный чанк: грузится только здесь, а не на старте приложения
    const { mountAcrylicView } = await import('./acrylicView');
    const mountedView = await mountAcrylicView(element, {
      quality: props.quality ?? getAutoQuality(),
      templateColor: glowColor.value,
      isWebGLForced: checkWebGLForced(),
      onFail: failHandler,
    });
    // Экран закрыли, пока шла загрузка, — сразу освобождаем
    if (isUnmounted) {
      mountedView.dispose();
      return;
    }
    view = mountedView;
    view.setLit(props.lightStand);
    await updateDesign();
  } catch {
    failHandler();
  }
});

watch(() => [props.design, props.image], scheduleDesignUpdate, { deep: true });

watch(
  () => props.lightStand,
  (isLit) => view?.setLit(isLit),
);

watch(glowColor, (color) => view?.setTemplateColor(color));

onBeforeUnmount(() => {
  isUnmounted = true;
  if (designTimer !== null) {
    clearTimeout(designTimer);
  }
  view?.dispose();
  view = null;
});
</script>

<style scoped>
.acrylic-plaque {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* Холст кладёт сюда acrylicView: он больше места предмета, чтобы при повороте углы не обрезались.
   touch-action: none — свайп по плашке вращает её, а не прокручивает страницу */
.acrylic-plaque :deep(canvas) {
  position: absolute;
  /* У canvas есть свой размер, поэтому left + right его не растянут — ширина и высота заданы явно */
  top: calc(var(--overflow-y) * -1);
  left: calc(var(--overflow-x) * -1);
  display: block;
  width: calc(100% + var(--overflow-x) * 2);
  height: calc(100% + var(--overflow-y) * 2);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.acrylic-plaque--ready {
  pointer-events: auto;
  cursor: grab;
}

.acrylic-plaque--ready:active {
  cursor: grabbing;
}
</style>
