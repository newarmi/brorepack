import type { FaceitProfile, Order } from '@brorepack/shared';

export const createProfileFixture = (overrides: Partial<FaceitProfile> = {}): FaceitProfile => {
  return {
    playerId: 'player-1',
    nickname: 'goodlifeee',
    avatarUrl: null,
    country: 'ru',
    level: 9,
    elo: 1809,
    stats: null,
    source: 'mock',
    ...overrides,
  };
};

export const createOrderFixture = (overrides: Partial<Order> = {}): Order => {
  return {
    id: 42,
    number: '1042',
    status: 'awaiting_payment',
    faceitPlayerId: 'player-1',
    faceitNickname: 'goodlifeee',
    design: {
      templateId: 'graphite',
      size: 'A5',
      displayName: 'goodlifeee',
      caption: 'for reaching 9 lvl 1809 elo',
      level: 9,
      elo: 1809,
    },
    extras: { lightStand: false },
    delivery: {
      method: 'cdek_pvz',
      city: 'Москва',
      address: '7, Тверская улица, Москва, Россия',
      location: { lat: 55.7609, lon: 37.6087 },
    },
    recipient: { name: 'Иван Иванов', phone: '+79000000000' },
    price: { lines: [{ code: 'plaque', label: 'Плашка A5', amount: 2490 }], total: 2490 },
    trackingNumber: null,
    comment: null,
    customer: { telegramId: 1, username: 'ivan', firstName: 'Иван' },
    createdAt: '2026-10-13T14:32:00.000Z',
    paidAt: null,
    updatedAt: '2026-10-13T14:32:00.000Z',
    ...overrides,
  };
};

export const createJsonResponse = (body: unknown, status = 200): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};
