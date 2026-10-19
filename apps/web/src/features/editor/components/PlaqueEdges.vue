<template>
  <!-- Четыре торца акрила (CSS-версия плашки). Своего 3D-пространства не создают: стоят ребром
       внутри плашки у родителя, толщина — его --plaque-depth -->
  <span class="plaque-edges__edge plaque-edges__edge--left" aria-hidden="true" />
  <span class="plaque-edges__edge plaque-edges__edge--right" aria-hidden="true" />
  <span class="plaque-edges__edge plaque-edges__edge--top" aria-hidden="true" />
  <span class="plaque-edges__edge plaque-edges__edge--bottom" aria-hidden="true" />
</template>

<style scoped>
/* Торец стоит ребром в середине толщины. Отступы — на скругление углов плашки (1.9% / 1.35%) */
.plaque-edges__edge {
  position: absolute;
  background: linear-gradient(
    90deg,
    rgb(255 255 255 / 45%),
    rgb(200 220 220 / 18%) 50%,
    rgb(255 255 255 / 35%)
  );
}

.plaque-edges__edge--left,
.plaque-edges__edge--right {
  top: 1.35%;
  bottom: 1.35%;
  left: calc(var(--plaque-depth) / -2);
  width: var(--plaque-depth);
  transform: rotateY(90deg);
}

.plaque-edges__edge--right {
  left: calc(100% - var(--plaque-depth) / 2);
}

.plaque-edges__edge--top,
.plaque-edges__edge--bottom {
  top: calc(var(--plaque-depth) / -2);
  left: 1.9%;
  right: 1.9%;
  height: var(--plaque-depth);
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 45%),
    rgb(200 220 220 / 18%) 50%,
    rgb(255 255 255 / 35%)
  );
  transform: rotateX(90deg);
}

.plaque-edges__edge--bottom {
  top: calc(100% - var(--plaque-depth) / 2);
}
</style>
