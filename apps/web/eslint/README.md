# Правила ESLint для apps/web

ESLint проверяет правила проекта из `apps/web/CLAUDE.md`. Главный принцип: код понятен обычному разработчику с первого прочтения. Правило отключаем только в исключительном случае: комментарием `eslint-disable` на конкретной строке и с объяснением, почему по-другому нельзя (пример — `v-html` в `PlaquePreview.vue`).

Запуск: `pnpm lint`, с автоисправлением — `pnpm lint:fix`. Линтер проверяет и типы (`recommendedTypeChecked`), поэтому видит, например, неотловленные промисы.

| Файл | Что внутри |
|---|---|
| `eslint.config.js` | сборка конфига и правила стиля, простоты, TypeScript, Vue |
| `eslint/architecture.js` | слои, модули через `index.ts`, изоляция фич |
| `eslint/restrictedSyntax.js` | единые точки доступа и запрет магических строк |
| `eslint/naming.js` | соглашения об именах |
| `eslint/rules/*` | свои правила проекта (`local/*`) |

## 1. Архитектура (`no-restricted-imports`)

| Правило | Нельзя | Нужно |
|---|---|---|
| Зависимости только вниз: `app → pages → features → entities → shared` | `shared` импортирует `@/entities/draft` | поднять код в нижний слой или передать параметром |
| Фича не видит другую фичу | `features/admin` импортирует `@/features/checkout` | вынести общее в `entities/` или `shared/` |
| Чужой модуль — только через `index.ts` | `@/entities/order/api/orders` | `@/entities/order` |
| Относительный путь — не дальше соседней папки | `../../utils/x` | `../utils/x` или `@/…` |
| `zod` только через `@brorepack/shared` | `import { z } from 'zod'` | `createOrderInputSchema` из `@brorepack/shared` |

Внутри `shared/` модули импортируют друг друга по прямому пути (`@/shared/api/errors`): иначе их `index.ts` замкнулись бы в цикл.

## 2. Единые точки доступа и константы (`no-restricted-syntax`)

| Что | Где разрешено | Почему |
|---|---|---|
| `import.meta.env` | `shared/config/env.ts` | переменные окружения описаны в одном месте |
| `window.Telegram` | `shared/telegram/webApp/webApp.ts` | всё общение с Telegram — через `@/shared/telegram`, вне Telegram работают заглушки |
| `fetch(...)` | `shared/api/transports/http.ts`, `features/admin/print/embeddedFonts.ts`, `entities/plaque/utils/art.ts`, `app/update/reloadIfOutdated.ts` | запросы — через `call()`, он сам выбирает REST или GAS |
| `localStorage` / `sessionStorage` | `entities/draft/utils/storage.ts`, `app/update/reloadIfOutdated.ts` | хранилище бывает недоступно, обработка сделана в одном месте |
| Сравнение со строкой статуса, шаблона или доставки (`=== 'paid'`, `case 'custom'`) | нигде | `ORDER_STATUS`, `PAYMENT_STATUS`, `CUSTOM_TEMPLATE_ID`, `DELIVERY_METHOD` |
| Имя маршрута строкой: `router.push({ name: 'order' })`, `:to="{ name: 'admin' }"` | нигде | `ROUTE_NAMES` |
| `enum` | нигде | объект с `as const` |
| `for…in` | нигде | `for…of` по `Object.entries` |

В тестах разрешены хранилище, Telegram, `fetch` и строковые статусы: там они нужны для подготовки данных и моков.

## 3. Нейминг (`@typescript-eslint/naming-convention`, `id-denylist`, `local/*`)

| Что | Как | Пример |
|---|---|---|
| Переменные, функции, параметры | camelCase | `orderPrice`, `buildOrderInput` |
| Модульные константы-примитивы и объекты-енумы | UPPER_SNAKE_CASE (можно и camelCase) | `PRINT_DPI`, `ROUTE_NAMES` |
| boolean-переменные | префикс `is` / `has` / `can` / `should` | `isLoading`, `hasProfile`, `IS_GAS_TRANSPORT` |
| Типы и интерфейсы | PascalCase, `interface` вместо `type` для объектов | `DraftState` |
| Обработчик события из шаблона, объявленный в компоненте | суффикс `Handler` (`local/handler-naming`) | `@click="buildPlaqueHandler"` |
| Файл в `composables/` | `useX.ts`, `export const useX` и `export default useX` (`local/composable-file`) | `useCheckout.ts` |
| `index.ts` модуля | начинается с `/** … */`: что делает и с кем связан (`local/module-index-header`) | `features/checkout/index.ts` |
| Сокращения | запрещены: `e`, `err`, `res`, `cfg`, `tmp`, `val`, `cb`, `fn`, `el`, `btn`, `idx`, `ctx`, `msg`, `opts`… | `error`, `response`, `handler` |

Свойства объектов не проверяются: они повторяют внешние форматы — поля API Telegram (`is_visible`), HTTP-заголовки, CSS-классы.

Функции из composables, которые вызываются в шаблоне как есть (`@retry="load"`, `@click="reload"`), суффикс `Handler` не требуют: проверяются только функции, объявленные в самом компоненте.

## 4. Простота

| Правило | Лимит | Что делать при превышении |
|---|---|---|
| `max-lines-per-function` | 50 строк | выделить часть в функцию или composable |
| `max-lines` | 250 строк на файл | разделить файл по ответственности |
| `max-depth` | вложенность блоков 2 | ранний `return`, отдельная функция |
| `complexity` | 10 веток | таблица `Record<вариант, обработчик>` вместо цепочки `if` |
| `max-params` | 3 параметра | объект параметров |
| `max-nested-callbacks` | 3 | вынести колбэк в именованную функцию |
| `no-nested-ternary` | — | `if` с ранним `return` |
| `no-else-return`, `no-lonely-if` | — | ранний `return` |
| `no-implicit-coercion` | — | `Boolean(x)`, а не `!!x` |
| `no-param-reassign` | — | не менять аргументы, вернуть новое значение |
| `vue/max-props` | 6 (у базовых `shared/ui` — 16) | разделить компонент |
| `vue/max-template-depth` | 7 уровней | вынести часть разметки в компонент |

В тестах лимиты длины сняты: сценарий читается сверху вниз.

## 5. Стиль кода (izagorin)

- `func-style: expression`, `prefer-arrow-callback`: функции пишем как `const fn = () => {}`. Классы — только для ошибок (`ApiError`).
- `curly: all`: фигурные скобки у любого `if`.
- `eqeqeq`, `prefer-template`, `object-shorthand`, `prefer-const`.
- `no-console`: отладочный вывод в коде не оставляем.
- Порядок импортов (`simple-import-sort`), группы через пустую строку: побочные эффекты → `node:` → `vue`, `vue-router`, `pinia` → остальные пакеты → `@/` → относительные.
- `@typescript-eslint/consistent-type-imports`: типы — отдельной строкой `import type`.

## 6. TypeScript

| Правило | Зачем |
|---|---|
| `no-floating-promises`, `no-misused-promises` | промис нельзя «потерять»: либо `await`, либо явно `void promise` |
| `no-non-null-assertion` | вместо `x!` — проверка или `?.` |
| `prefer-nullish-coalescing` | `??` вместо `\|\|`; для строк `\|\|` разрешён — пустая строка тоже заменяется значением по умолчанию |
| `prefer-optional-chain` | `a?.b` вместо `a && a.b` |
| `switch-exhaustiveness-check` | `switch` по union обрабатывает все варианты |
| `no-base-to-string` | нельзя случайно получить `[object Object]` |
| `no-unused-vars` | неиспользуемое удаляем; неиспользуемый аргумент — с `_` |

## 7. Vue

| Правило | Как пишем |
|---|---|
| `vue/block-order` | `<template>` → `<script setup lang="ts">` → `<style scoped>` |
| `vue/component-api-style` | только `<script setup>` |
| `vue/define-macros-order` | `defineEmits` → `defineModel` → `defineProps` → `defineSlots` |
| `vue/define-props-declaration`, `vue/define-emits-declaration` | на типах: `defineProps<{ … }>()`, `defineEmits<{ close: [] }>()` |
| `vue/require-macro-variable-name` | `const props`, `const emits`, `const slots` |
| `vue/require-explicit-slots` | все слоты описаны в `defineSlots` с комментарием |
| `vue/no-unused-properties`, `vue/no-unused-emit-declarations`, `vue/no-unused-refs` | неиспользуемые props, события и ref удаляем |
| `vue/attribute-hyphenation`, `vue/v-on-event-hyphenation` | camelCase в шаблоне: `:errorText`, `@requestPhone` |
| `vue/v-bind-style` | короткая запись для одноимённого значения: `:order` вместо `:order="order"` |
| `vue/prefer-true-attribute-shorthand` | `showcase` вместо `:showcase="true"` |
| `vue/no-useless-v-bind`, `vue/prefer-separate-static-class`, `vue/no-static-inline-styles` | статика — обычными атрибутами и классами, стили — в `<style scoped>` |
| `vue/require-typed-ref`, `vue/prefer-use-template-ref`, `vue/no-ref-object-reactivity-loss` | `ref<Type>()`, `useTemplateRef`, без потери реактивности при деструктуризации |
| `vue/no-undef-components` | каждый компонент импортирован явно |

## Как добавить правило

1. Есть в ESLint или плагине — добавить в `eslint.config.js`, в раздел по смыслу.
2. Запрет конструкции — добавить ключ в `RESTRICTED_SYNTAX` (`eslint/restrictedSyntax.js`). Исключение для конкретного файла — в `restrictedSyntaxExceptions`.
3. Нужна своя логика — написать правило в `eslint/rules/` и зарегистрировать в `eslint/plugin.js`.
4. Обновить эту таблицу и прогнать `pnpm lint:fix && pnpm test`.
