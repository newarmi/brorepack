import './styles/fonts';
import './styles/tokens.css';
import './styles/base.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import { useSessionStore } from '@/entities/session';
import { initTelegram, useBackButtonStore } from '@/shared/telegram';
import { useToast } from '@/shared/ui';

import App from './App.vue';
import { router } from './router';
import { goBack } from './router/navigation/goBack';
import { reloadIfOutdated } from './update/reloadIfOutdated';

// Старая копия из кэша Telegram: обновляемся сразу при запуске. Ошибка загрузки экрана (чанк старой
// сборки уже удалён с сервера) — тот же случай
void reloadIfOutdated();
window.addEventListener('vite:preloadError', () => void reloadIfOutdated());

const app = createApp(App);
app.use(createPinia());
app.use(router);

initTelegram();
useBackButtonStore().setDefaultHandler(() => goBack(router));

// Профиль пользователя нужен почти везде (ссылка на админку, guard) — грузим сразу, не блокируя экран
const session = useSessionStore();
void session.load().then(() => {
  if (session.status === 'error') {
    useToast().showErrorToast(session.error);
  }
});

app.mount('#app');
