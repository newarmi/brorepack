/**
 * Всё общение с Telegram WebApp.
 * webApp/initTelegram — один раз при старте: внешний вид, привязка BackButton, нативная MainButton прячется.
 * stores — общее состояние MainButton и BackButton. Главную кнопку рисует MainButtonBar (своя и в Telegram),
 * «Назад» — нативная BackButton или DevTelegramChrome вне Telegram.
 * composables: useMainButton / useBackButton — экран занимает кнопку, useTelegram — вибрация, оплата, контакт.
 */

export { default as DevTelegramChrome } from './components/DevTelegramChrome.vue';
export { default as MainButtonBar } from './components/MainButtonBar.vue';
export { useBackButton } from './composables/useBackButton';
export { useMainButton } from './composables/useMainButton';
export { useTelegram } from './composables/useTelegram';
export { useBackButtonStore } from './stores/backButtonStore';
export { useMainButtonStore } from './stores/mainButtonStore';
export { initTelegram } from './webApp/initTelegram';
export { describeTelegramClient } from './webApp/webApp';
