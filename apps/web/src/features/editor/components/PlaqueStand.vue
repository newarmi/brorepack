<template>
  <!-- Брусок из шести граней. Своего 3D-пространства не создаёт: наклоняется вместе с плашкой у родителя -->
  <span class="plaque-stand" :class="{ 'plaque-stand--lit': props.isLit }" aria-hidden="true">
    <span class="plaque-stand__face plaque-stand__face--top" />
    <span class="plaque-stand__face plaque-stand__face--bottom" />
    <span class="plaque-stand__face plaque-stand__face--back" />
    <span class="plaque-stand__face plaque-stand__face--left" />
    <span class="plaque-stand__face plaque-stand__face--right" />
    <span class="plaque-stand__face plaque-stand__face--front" />
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Подсветка включена — подставку видно; выключена — грани прозрачные, но место заняли */
    isLit?: boolean;
  }>(),
  { isLit: false },
);
</script>

<style scoped>
.plaque-stand {
  --stand-height: 14px;
  --stand-depth: 48px;

  position: relative;
  width: 100%;
  height: var(--stand-height);
  margin-top: -2px;
  transform-style: preserve-3d;
}

/* Прозрачность — на гранях, а не на бруске: opacity < 1 у контейнера сплющила бы 3D */
.plaque-stand__face {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #141414;
  opacity: 0;
  transition: opacity 300ms ease;
}

.plaque-stand--lit .plaque-stand__face {
  opacity: 1;
}

/* Верх и низ: лежат горизонтально, по глубине от задней грани до передней.
   На верхней грани посередине — паз, в котором стоит плашка. Ширина паза — толщина плашки
   (--plaque-depth из PlaqueStage) с зазором 1px с каждой стороны */
.plaque-stand__face--top,
.plaque-stand__face--bottom {
  height: var(--stand-depth);
  transform-origin: 50% 0;
  transform: translateZ(calc(var(--stand-depth) / 2)) rotateX(-90deg);
}

.plaque-stand__face--top {
  --slot-half: calc(var(--plaque-depth, 3px) / 2 + 1px);

  border-radius: 3px;
  background: linear-gradient(
    180deg,
    #3a3a3a 0%,
    #262626 calc(50% - var(--slot-half) - 1.5px),
    #050505 calc(50% - var(--slot-half)),
    #050505 calc(50% + var(--slot-half)),
    #1c1c1c calc(50% + var(--slot-half) + 1.5px),
    #2a2a2a 100%
  );
}

.plaque-stand__face--bottom {
  top: 100%;
  background: #0b0b0b;
}

/* Бока: вертикальные, по глубине */
.plaque-stand__face--left,
.plaque-stand__face--right {
  width: var(--stand-depth);
  transform-origin: 0 50%;
  transform: translateZ(calc(var(--stand-depth) / 2)) rotateY(90deg);
  background: linear-gradient(90deg, #1f1f1f, #0e0e0e);
}

.plaque-stand__face--right {
  left: 100%;
}

.plaque-stand__face--back {
  transform: translateZ(calc(var(--stand-depth) / -2));
  background: #0e0e0e;
}

/* Лицевая грань — с прежним светом подставки */
.plaque-stand__face--front {
  border-radius: 0 0 4px 4px;
  background: linear-gradient(180deg, #2a2a2a, #111);
  box-shadow:
    0 -2px 12px rgb(255 255 255 / 25%),
    inset 0 1px 0 rgb(255 255 255 / 15%);
  transform: translateZ(calc(var(--stand-depth) / 2));
}
</style>
