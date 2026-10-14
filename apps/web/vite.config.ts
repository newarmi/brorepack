import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

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
  plugins: [vue()],
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
