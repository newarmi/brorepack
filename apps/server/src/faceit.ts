import { createHash } from 'node:crypto'
import { getLevelByElo, type FaceitProfile, type FaceitStats } from '@brorepack/shared'
import type { FastifyBaseLogger } from 'fastify'
import { z } from 'zod'
import { HttpError } from './errors'

const FACEIT_API_URL = 'https://open.faceit.com/data/v4'
const CACHE_TTL_MS = 60_000
const CACHE_MAX_ENTRIES = 1000
const REQUEST_TIMEOUT_MS = 8_000

export interface FaceitClient {
  getPlayer(nickname: string): Promise<FaceitProfile>
}

export const playerNotFound = (message = 'Игрок с таким ником не найден на FACEIT') =>
  new HttpError(404, 'player_not_found', message)

export const faceitUnavailable = () =>
  new HttpError(502, 'faceit_unavailable', 'FACEIT не отвечает, попробуй чуть позже')

// --- mock ---

const round2 = (value: number) => Math.round(value * 100) / 100

/** Профиль из макета Figma */
const MOCK_FIXTURES: Record<string, Omit<FaceitProfile, 'nickname'>> = {
  goodlifeee: {
    playerId: '5f3c2a9e-8b1d-4c7a-9e2f-1a6b0d4c8e19',
    avatarUrl: null,
    country: 'ru',
    level: 9,
    elo: 1809,
    stats: { matches: 1248, winRate: 54, kd: 1.18, headshots: 47 },
    source: 'mock',
  },
}

/** Детерминированный фейковый профиль: один и тот же ник — всегда одни и те же цифры */
export function createMockProfile(nickname: string): FaceitProfile {
  const key = nickname.toLowerCase()
  if (key === 'notfound') throw playerNotFound()

  const fixture = MOCK_FIXTURES[key]
  if (fixture) return { nickname, ...fixture }

  const digest = createHash('sha256').update(key).digest()
  const elo = 600 + (digest.readUInt16BE(0) % 1801)
  const skill = (elo - 600) / 1800
  const hex = digest.subarray(16, 32).toString('hex')
  const stats: FaceitStats = {
    matches: 80 + (digest.readUInt16BE(2) % 2900),
    winRate: Math.round(44 + skill * 10 + (digest[4]! % 5)),
    kd: round2(0.78 + skill * 0.55 + (digest[5]! % 12) / 100),
    headshots: 34 + (digest[6]! % 24),
  }

  return {
    playerId: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`,
    nickname,
    avatarUrl: null,
    country: 'ru',
    level: getLevelByElo(elo),
    elo,
    stats,
    source: 'mock',
  }
}

export function createMockFaceitClient(): FaceitClient {
  return {
    async getPlayer(nickname) {
      return createMockProfile(nickname)
    },
  }
}

// --- live: FACEIT Data API v4 ---

const playerResponseSchema = z.looseObject({
  player_id: z.string().min(1),
  nickname: z.string().min(1),
  avatar: z.string().nullish(),
  country: z.string().nullish(),
  games: z
    .looseObject({
      cs2: z
        .looseObject({
          skill_level: z.coerce.number().int(),
          faceit_elo: z.coerce.number().int(),
        })
        .optional(),
    })
    .nullish(),
})

const statsResponseSchema = z.looseObject({
  lifetime: z.record(z.string(), z.unknown()),
})

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function parseLifetimeStats(lifetime: Record<string, unknown>): FaceitStats | null {
  const matches = toNumber(lifetime['Matches'])
  const winRate = toNumber(lifetime['Win Rate %'])
  const kd = toNumber(lifetime['Average K/D Ratio'])
  const headshots = toNumber(lifetime['Average Headshots %'])
  if (matches === null || winRate === null || kd === null || headshots === null) return null
  return { matches, winRate, kd, headshots }
}

interface LiveClientOptions {
  apiKey: string
  logger: FastifyBaseLogger
  fetchImpl?: typeof fetch
}

export function createLiveFaceitClient({ apiKey, logger, fetchImpl = fetch }: LiveClientOptions): FaceitClient {
  async function requestJson(path: string): Promise<unknown> {
    let response: Response
    try {
      response = await fetchImpl(`${FACEIT_API_URL}${path}`, {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
    } catch (error) {
      logger.warn({ err: error, path }, 'FACEIT: сетевая ошибка')
      throw faceitUnavailable()
    }
    if (response.status === 404) throw playerNotFound()
    if (!response.ok) {
      logger.warn({ status: response.status, path }, 'FACEIT: неуспешный ответ')
      throw faceitUnavailable()
    }
    try {
      return await response.json()
    } catch (error) {
      logger.warn({ err: error, path }, 'FACEIT: некорректный JSON')
      throw faceitUnavailable()
    }
  }

  async function fetchStats(playerId: string): Promise<FaceitStats | null> {
    try {
      const parsed = statsResponseSchema.safeParse(await requestJson(`/players/${encodeURIComponent(playerId)}/stats/cs2`))
      return parsed.success ? parseLifetimeStats(parsed.data.lifetime) : null
    } catch (error) {
      logger.info({ err: error, playerId }, 'FACEIT: статистика недоступна, отдаём профиль без неё')
      return null
    }
  }

  return {
    async getPlayer(nickname) {
      const query = new URLSearchParams({ nickname, game: 'cs2' })
      const parsed = playerResponseSchema.safeParse(await requestJson(`/players?${query}`))
      if (!parsed.success) {
        logger.warn({ issues: parsed.error.issues, nickname }, 'FACEIT: неожиданный формат профиля')
        throw faceitUnavailable()
      }

      const player = parsed.data
      const cs2 = player.games?.cs2
      if (!cs2) throw playerNotFound('У игрока нет CS2 на FACEIT')

      return {
        playerId: player.player_id,
        nickname: player.nickname,
        avatarUrl: player.avatar || null,
        country: player.country ? player.country.toLowerCase() : null,
        level: cs2.skill_level,
        elo: cs2.faceit_elo,
        stats: await fetchStats(player.player_id),
        source: 'faceit',
      }
    },
  }
}

/** Кэш на 60 с по нику в нижнем регистре; параллельные запросы одного ника делят один промис */
export function withCache(client: FaceitClient, ttlMs = CACHE_TTL_MS, now = Date.now): FaceitClient {
  const cache = new Map<string, { expiresAt: number; promise: Promise<FaceitProfile> }>()

  function prune(): void {
    const time = now()
    for (const [key, entry] of cache) if (entry.expiresAt <= time) cache.delete(key)
    while (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value
      if (oldestKey === undefined) break
      cache.delete(oldestKey)
    }
  }

  return {
    getPlayer(nickname) {
      const key = nickname.toLowerCase()
      const cached = cache.get(key)
      if (cached && cached.expiresAt > now()) return cached.promise

      prune()
      const promise = client.getPlayer(nickname)
      cache.set(key, { expiresAt: now() + ttlMs, promise })
      promise.catch(() => {
        if (cache.get(key)?.promise === promise) cache.delete(key)
      })
      return promise
    },
  }
}

export function createFaceitClient(
  options: { mode: 'mock' | 'live'; apiKey: string | null },
  logger: FastifyBaseLogger,
): FaceitClient {
  if (options.mode === 'mock') return withCache(createMockFaceitClient())
  if (!options.apiKey) throw new Error('FACEIT_MODE=live требует FACEIT_API_KEY')
  return withCache(createLiveFaceitClient({ apiKey: options.apiKey, logger }))
}
