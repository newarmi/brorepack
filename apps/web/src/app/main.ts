import './styles/fonts';
import './styles/tokens.css';
import './styles/base.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import { useSessionStore } from '@/entities/session';
import { initTelegram,useBackButtonStore } from '@/shared/telegram';
import { useToast } from '@/shared/ui';

import App from './App.vue';
import { router } from './router';
import { goBack } from './router/navigation/goBack';

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
