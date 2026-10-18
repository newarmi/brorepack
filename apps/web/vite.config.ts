import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import type { Plugin } from 'vite';
import { defineConfig } from 'vite';

// Номер сборки: в GitHub Actions — коммит, локально — время сборки
const BUILD_ID = process.env.GITHUB_SHA?.slice(0, 12) ?? String(Date.now());

// version.json рядом с index.html: открытое из кэша приложение сверяет с ним свой номер (app/update)
const buildVersionPlugin: Plugin = {
  name: 'build-version',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ buildId: BUILD_ID }),
    });
  },
};

// Локально фронт ходит в apps/server через прокси — и в dev, и в preview
const apiProxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
};

export default defineConfig({
  // Относительные пути: собранный фронт раздаёт сервер, роутинг — через hash
  base: './',
  plugins: [vue(), buildVersionPlugin],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});
