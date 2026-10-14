import './fonts';
import './styles/tokens.css';
import './styles/base.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import { useSessionStore } from '@/entities/session/store';
import { useBackButtonStore } from '@/shared/telegram/backButtonStore';
import { initTelegram } from '@/shared/telegram/initTelegram';
import { useToast } from '@/shared/ui/useToast';

import App from './App.vue';
import { router } from './router';
import { goBack } from './router/goBack';

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
