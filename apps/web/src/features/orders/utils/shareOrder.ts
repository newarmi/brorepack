import type { Order } from '@brorepack/shared';

import { BOT_URL } from '@/shared/config';
import { useTelegram } from '@/shared/telegram';

/** «Поделиться превью»: системный выбор чата Telegram со ссылкой на бота */
export const shareOrder = (order: Order): void => {
  const text = `Собрал плашку за ${order.design.level} lvl на FACEIT`;
  useTelegram().openTelegramLink(
    `https://t.me/share/url?url=${encodeURIComponent(BOT_URL)}&text=${encodeURIComponent(text)}`,
  );
};
