<template>
  <p class="mock-notice" role="note">
    <strong class="mock-notice__title">Тестовые данные, не из FACEIT</strong>
    Сервер работает без ключа FACEIT API, поэтому уровень и ELO выдуманы. В боевом режиме здесь
    будут настоящие цифры.
  </p>
</template>

<style scoped>
.mock-notice {
  padding: 12px 14px;
  border: 1px solid var(--color-warn);
  border-radius: 14px;
  background: var(--color-warn-soft);
  color: var(--color-text);
  font-size: 13px;
  line-height: 1.4;
}

.mock-notice__title {
  display: block;
  margin-bottom: 2px;
  color: var(--color-warn);
  font-size: 14px;
}
</style>
