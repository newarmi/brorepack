/**
 * Роутер приложения: hash-история + маршруты (routes/) + проверки переходов (guards/).
 * «Назад» по умолчанию — navigation/goBack, его подключает app/main.ts к кнопке Telegram.
 */
import { createRouter, createWebHashHistory } from 'vue-router';

import { installGuards } from './guards';
import { routes } from './routes';

// Hash-история: фронт раздаётся и с GitHub Pages, и Node-сервером без настройки rewrite
export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
  routes,
});

installGuards(router);
