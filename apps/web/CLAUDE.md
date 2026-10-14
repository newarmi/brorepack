# apps/web — правила кода

Telegram Mini App на Vue 3 + Pinia + Vue Router + Vite, TypeScript.

## Главный принцип

Код должен быть простым: обычный разработчик понимает его с первого прочтения. Если простота конфликтует с любым другим правилом, выбираем простоту. Абстракцию вводим, только когда у неё 2+ реальных использования.

## Структура `src/`

```
app/       точка входа, App.vue, роутер (routes, guards, deepLink, goBack), шрифты, глобальные стили
pages/     экраны: только раскладывают фичи и связывают их с MainButton/BackButton
features/  сценарии: start, nickname, profile, editor, checkout, orders, admin
entities/  общие для фич сущности: draft, session, order, payment, plaque, player
shared/    без бизнес-логики: api (REST/GAS), telegram, ui, lib, config, testing
```

Импорты идут только вниз: `app → pages → features → entities → shared`. Фича не импортирует другую фичу: если что-то нужно двум фичам, это поднимается в `entities` или `shared`. Из чужой папки импортируем только через `@/`, путей `../` нет. Всё это проверяет `pnpm lint` (`no-restricted-imports` в `eslint.config.js`).

Куда класть код:
- запрос к API → `api.ts` той фичи или сущности, через `call()` из `@/shared/api/client` (один endpoint описывается сразу для REST и для GAS);
- загрузка данных для экрана → `useAsyncData` (скелетон, ошибка, отмена, тихое обновление), разметка состояний → `AsyncState`;
- Telegram (кнопки, вибрация, оплата, контакт) → только через `@/shared/telegram`;
- `import.meta.env` → только в `shared/config/env.ts`;
- имена маршрутов → `ROUTE_NAMES`, статусы → `ORDER_STATUS`, коды ошибок → `API_ERROR_CODES`. Строковых литералов вместо них не пишем.

## Стиль (izagorin, адаптирован под TS + Pinia + zod)

- SFC: `<template>` → `<script setup lang="ts">` → `<style scoped>`.
- `const emits = defineEmits<…>()`, `defineModel`, `const props = defineProps<…>()` (без деструктуризации, обращение через `props.x`).
- В шаблоне атрибуты и события в camelCase: `:errorText`, `@requestPhone`.
- Функции — `const fn = () => {}`, у `if` всегда фигурные скобки, вместо `else` — ранний `return`.
- Нейминг: `is*`/`has*` для boolean, `check*` для предикатов, `get*`/`build*`/`create*`, обработчики из шаблона — `*Handler`.
- Composable: именованный и `default` экспорт.
- Варианты задаются таблицей (`Record<status, handler>`), а не цепочкой `if`.
- Лимиты линтера: функция ≤ 50 строк, файл ≤ 250, вложенность ≤ 2, сложность ≤ 10. Если упёрлись — делим модуль, а правило не отключаем.
- Существующие комментарии не удаляем.

## Неизменяемое поведение

Не меняем без отдельного решения: пути и имена маршрутов, deep-link `startapp=order_<id>|admin`, ключ черновика `brorepack:draft:v2`, REST-пути и GAS-actions (их ждут `apps/server` и `apps/gas`).

## Окружение и проверки

- Node 22 (`nvm use`): Vitest 5 требует ≥ 22.12.
- TypeScript закреплён на `~6.0`: typescript-eslint поддерживает < 6.1, а vue-tsc пока не работает с TS 7, который стоит в shared/server.
- Перед коммитом: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`. Форматирование — `pnpm format`.
- Тесты лежат рядом с кодом (`*.test.ts`). Хелперы — в `shared/testing` (`withSetup` для composables с хуками, фикстуры).
