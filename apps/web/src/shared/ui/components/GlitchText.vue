<template>
  <span class="glitch-text" :class="{ 'glitch-text--glitch': isGlitching }">
    <span class="visually-hidden">{{ props.text }}</span>
    <!-- Каждая цифра — барабан 0–9, он прокручивается к новой цифре.
         Изменившиеся буквы на мгновение перебирают пиксельные глифы и проявляются слева направо -->
    <span class="glitch-text__chars" aria-hidden="true">
      <span v-for="char in chars" :key="char.key" class="glitch-text__char">
        <span v-if="char.digit === null">{{ char.value }}</span>
        <span v-else class="glitch-text__digit">
          <span
            class="glitch-text__reel"
            :style="{ transform: `translateY(${-char.digit * 10}%)` }"
          >
            <span v-for="digit in DIGITS" :key="digit">{{ digit }}</span>
          </span>
        </span>
      </span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, watch } from 'vue';

import { useTextScramble } from '../composables/useTextScramble';

const props = defineProps<{
  /** Готовая строка: «3 470 ₽», «Оплатить 3 470 ₽» */
  text: string;
}>();

// Барабан — 10 цифр столбиком: сдвиг на цифру — 10% его высоты
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const GLITCH_MS = 360;

interface GlitchChar {
  key: string;
  value: string;
  digit: number | null;
}

const { scrambled } = useTextScramble(() => props.text);

// Ключ — позиция с конца: «990» → «1 080» докручивает единицы и десятки, а не пересоздаёт их
const chars = computed<GlitchChar[]>(() => {
  const symbols = [...props.text];
  return symbols.map((value, index) => ({
    key: String(symbols.length - index),
    value: scrambled.value?.[index] ?? value,
    digit: /\d/.test(value) ? Number(value) : null,
  }));
});

const isGlitching = shallowRef(false);
let timer: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.text,
  () => {
    clearTimeout(timer);
    // Сначала снимаем класс, на следующем кадре ставим: анимация перезапускается и при частой смене
    isGlitching.value = false;
    requestAnimationFrame(() => {
      isGlitching.value = true;
      timer = setTimeout(() => {
        isGlitching.value = false;
      }, GLITCH_MS);
    });
  },
);

onScopeDispose(() => clearTimeout(timer));
</script>

<style scoped>
.glitch-text {
  position: relative;
  display: inline-block;
  white-space: nowrap;
}

.glitch-text__chars {
  display: inline-flex;
}

.glitch-text__char {
  white-space: pre;
}

.glitch-text__digit {
  display: inline-block;
  height: 1.2em;
  overflow: hidden;
  line-height: 1.2em;
  vertical-align: bottom;
}

/* steps — цифры щёлкают по кадрам, как на табло, а не плывут */
.glitch-text__reel {
  display: flex;
  flex-direction: column;
  text-align: center;
  transition: transform 480ms steps(6, end);
}

/* Пиксельный глитч при смене: строку режет на полосы, сдвигает и разводит по цветам, сверху — сканлайны */
.glitch-text--glitch .glitch-text__chars {
  animation: glitch-text-glitch 360ms steps(1, end);
}

.glitch-text--glitch::after {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(0deg, rgb(0 0 0 / 35%) 0 1px, transparent 1px 3px);
  content: '';
  pointer-events: none;
  animation: glitch-text-scanlines 360ms steps(1, end) forwards;
}

@keyframes glitch-text-glitch {
  0% {
    clip-path: inset(0 0 55% 0);
    text-shadow:
      2px 0 #ff2a6d,
      -2px 0 #05d9e8;
    transform: translateX(-2px);
  }

  20% {
    clip-path: inset(45% 0 10% 0);
    transform: translateX(3px);
  }

  40% {
    clip-path: inset(10% 0 60% 0);
    text-shadow:
      -2px 0 #ff2a6d,
      2px 0 #05d9e8;
    transform: translateX(-1px);
  }

  60% {
    clip-path: inset(65% 0 0 0);
    transform: translateX(2px);
  }

  80% {
    clip-path: inset(0);
    text-shadow:
      1px 0 #ff2a6d,
      -1px 0 #05d9e8;
    transform: none;
  }

  100% {
    clip-path: none;
    text-shadow: none;
    transform: none;
  }
}

@keyframes glitch-text-scanlines {
  0% {
    opacity: 1;
  }

  70% {
    opacity: 0.6;
  }

  100% {
    opacity: 0;
  }
}
</style>
