<template>
  <section class="cancelled-notice card">
    <h2 class="cancelled-notice__title">Заказ отменён</h2>
    <p class="cancelled-notice__text">
      Если это ошибка или остались вопросы — напиши в чат с ботом, разберёмся.
    </p>
  </section>
</template>

<style scoped>
.cancelled-notice {
  padding: 18px 20px;
}

.cancelled-notice__title {
  color: var(--color-danger);
  font-size: 16px;
  font-weight: 700;
}

.cancelled-notice__text {
  margin-top: 6px;
  color: var(--color-muted);
  font-size: 14px;
}
</style>
