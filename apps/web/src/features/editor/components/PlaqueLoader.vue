<template>
  <!-- Кольцо посередине CSS-плашки, пока 3D-версия грузится и не стала интерактивной -->
  <span class="plaque-loader" role="status" aria-label="Загружаем 3D-плашку">
    <span class="plaque-loader__spinner spinner" aria-hidden="true" />
  </span>
</template>

<style scoped>
/* Тёмная подложка — чтобы кольцо читалось и на светлом шаблоне */
.plaque-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgb(0 0 0 / 55%);
  transform: translate(-50%, -50%);
}

.plaque-loader__spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--color-accent);
  border-right-color: transparent;
  border-radius: 50%;
  animation: plaque-loader-spin 0.8s linear infinite;
}

@keyframes plaque-loader-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
