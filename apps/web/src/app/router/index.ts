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
