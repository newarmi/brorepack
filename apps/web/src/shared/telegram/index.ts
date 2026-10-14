/**
 * Всё общение с Telegram WebApp.
 * webApp/initTelegram — один раз при старте: внешний вид и привязка нативных кнопок к сторам.
 * stores — общее состояние MainButton и BackButton; его читают и нативные кнопки, и DevTelegramChrome.
 * composables: useMainButton / useBackButton — экран занимает кнопку, useTelegram — вибрация, оплата, контакт.
 */

export { default as DevTelegramChrome } from './components/DevTelegramChrome.vue';
export { useBackButton } from './composables/useBackButton';
export { useMainButton } from './composables/useMainButton';
export { useTelegram } from './composables/useTelegram';
export { useBackButtonStore } from './stores/backButtonStore';
export { useMainButtonStore } from './stores/mainButtonStore';
export { initTelegram } from './webApp/initTelegram';
