import { getLevelByElo, type FaceitProfile, type FaceitStats } from '@brorepack/shared'
import { z } from 'zod'
import type { Config } from './config'
import { HttpError, describeError } from './errors'
import { toHex, toUnsigned } from './util'

// Порт apps/server/src/faceit.ts: те же режимы (mock / live), те же ответы и ошибки.

const FACEIT_API_URL = 'https://open.faceit.com/data/v4'
const CACHE_TTL_SECONDS = 60
const CACHE_KEY_PREFIX = 'faceit:'

export interface FaceitClient {
  getPlayer(nickname: string): FaceitProfile
}

export const playerNotFound = (message = 'Игрок с таким ником не найден на FACEIT') =>
  new HttpError(404, 'player_not_found', message)

export const faceitUnavailable = () => new HttpError(502, 'faceit_unavailable', 'FACEIT не отвечает, попробуй чуть позже')

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

/** Детерминированный фейковый профиль: один и тот же ник — всегда одни и те же цифры (как в Node-бэкенде) */
export function createMockProfile(nickname: string): FaceitProfile {
  const key = nickname.toLowerCase()
  if (key === 'notfound') throw playerNotFound()

  const fixture = MOCK_FIXTURES[key]
  if (fixture) return { nickname, ...fixture }

  const digest = toUnsigned(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key, Utilities.Charset.UTF_8))
  const byte = (index: number) => digest[index] ?? 0
  const uint16 = (index: number) => (byte(index) << 8) | byte(index + 1)
  const elo = 600 + (uint16(0) % 1801)
  const skill = (elo - 600) / 1800
  const hex = toHex(digest.slice(16, 32))
  const stats: FaceitStats = {
    matches: 80 + (uint16(2) % 2900),
    winRate: Math.round(44 + skill * 10 + (byte(4) % 5)),
    kd: round2(0.78 + skill * 0.55 + (byte(5) % 12) / 100),
    headshots: 34 + (byte(6) % 24),
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
  return { getPlayer: createMockProfile }
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

export function createLiveFaceitClient(apiKey: string): FaceitClient {
  function requestJson(path: string): unknown {
    let response: GoogleAppsScript.URL_Fetch.HTTPResponse
    try {
      response = UrlFetchApp.fetch(`${FACEIT_API_URL}${path}`, {
        method: 'get',
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
        muteHttpExceptions: true,
      })
    } catch (error) {
      console.warn(`FACEIT: сетевая ошибка (${path}): ${describeError(error)}`)
      throw faceitUnavailable()
    }
    const status = response.getResponseCode()
    if (status === 404) throw playerNotFound()
    if (status < 200 || status >= 300) {
      console.warn(`FACEIT: неуспешный ответ ${status} (${path})`)
      throw faceitUnavailable()
    }
    try {
      return JSON.parse(response.getContentText())
    } catch (error) {
      console.warn(`FACEIT: некорректный JSON (${path}): ${describeError(error)}`)
      throw faceitUnavailable()
    }
  }

  function fetchStats(playerId: string): FaceitStats | null {
    try {
      const parsed = statsResponseSchema.safeParse(requestJson(`/players/${encodeURIComponent(playerId)}/stats/cs2`))
      return parsed.success ? parseLifetimeStats(parsed.data.lifetime) : null
    } catch (error) {
      console.info(`FACEIT: статистика ${playerId} недоступна, отдаём профиль без неё: ${describeError(error)}`)
      return null
    }
  }

  return {
    getPlayer(nickname) {
      const parsed = playerResponseSchema.safeParse(
        requestJson(`/players?nickname=${encodeURIComponent(nickname)}&game=cs2`),
      )
      if (!parsed.success) {
        console.warn(`FACEIT: неожиданный формат профиля ${nickname}: ${JSON.stringify(parsed.error.issues)}`)
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
        stats: fetchStats(player.player_id),
        source: 'faceit',
      }
    },
  }
}

/** Кэш на 60 с по нику в нижнем регистре — в CacheService, он общий для всех запусков скрипта */
export function withCache(client: FaceitClient, ttlSeconds = CACHE_TTL_SECONDS): FaceitClient {
  return {
    getPlayer(nickname) {
      const key = `${CACHE_KEY_PREFIX}${nickname.toLowerCase()}`
      const cache = CacheService.getScriptCache()
      try {
        const cached = cache.get(key)
        if (cached) return JSON.parse(cached) as FaceitProfile
      } catch (error) {
        console.warn(`FACEIT: не удалось прочитать кэш: ${describeError(error)}`)
      }

      const profile = client.getPlayer(nickname)
      try {
        cache.put(key, JSON.stringify(profile), ttlSeconds)
      } catch (error) {
        console.warn(`FACEIT: не удалось записать кэш: ${describeError(error)}`)
      }
      return profile
    },
  }
}

export function createFaceitClient(config: Pick<Config, 'faceitMode' | 'faceitApiKey'>): FaceitClient {
  // mock детерминирован и бесплатен — кэш ему не нужен
  if (config.faceitMode === 'mock') return createMockFaceitClient()
  // Без ключа — понятная ошибка, а не «что-то пошло не так»: владелец сразу видит, чего не хватает
  if (!config.faceitApiKey) {
    throw new HttpError(503, 'faceit_not_configured', 'FACEIT не подключён: добавь FACEIT_API_KEY в свойства скрипта')
  }
  return withCache(createLiveFaceitClient(config.faceitApiKey))
}
