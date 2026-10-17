// Цвета темы для мест, куда не дотягиваются CSS-переменные: нативные кнопки и шапка Telegram.
// Должны совпадать с app/styles/tokens.css и theme-color в index.html
export const THEME_COLORS = {
  /** Верх экрана — шапка Telegram сливается с градиентом фона */
  header: '#262626',
  background: '#0B0B0B',
  accent: '#FF5500',
  accentText: '#0B0B0B',
  disabled: '#2C2C2C',
  disabledText: '#6B6B6B',
} as const;
