<template>
  <!-- Место предмета в вёрстке: холст внутри него шире и выше, чтобы при повороте ничего не обрезалось.
       Пока 3D не готово, касания проходят насквозь — к CSS-версии под ним -->
  <div
    ref="host"
    class="acrylic-plaque"
    :class="{ 'acrylic-plaque--ready': isReady }"
    :style="overflowStyle"
  >
    <!-- Пока грузится Three.js и рисуется текстура, плашку не повернуть — показываем, что 3D в пути.
         Если 3D недоступно, компонент убирают целиком, и лоадер уходит вместе с ним -->
    <Transition name="acrylic-plaque-loader">
      <span
        v-if="!isReady"
        class="acrylic-plaque__loader"
        role="status"
        aria-label="Загружаем 3D-плашку"
      >
        <span class="acrylic-plaque__spinner spinner" aria-hidden="true" />
      </span>
    </Transition>
  </div>
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

/* Посередине плашки, поверх холста (его кладут в DOM позже). Тёмная подложка — чтобы кольцо
   читалось и на светлом шаблоне */
.acrylic-plaque__loader {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgb(0 0 0 / 55%);
  transform: translate(-50%, -50%);
}

.acrylic-plaque__spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-accent);
  border-right-color: transparent;
  border-radius: 50%;
  animation: acrylic-plaque-spin 0.8s linear infinite;
}

.acrylic-plaque-loader-leave-active {
  transition: opacity var(--duration-base) var(--ease-out);
}

.acrylic-plaque-loader-leave-to {
  opacity: 0;
}

@keyframes acrylic-plaque-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
