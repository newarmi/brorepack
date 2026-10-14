import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getLevelByElo } from '@brorepack/shared'
import type { FastifyBaseLogger } from 'fastify'
import { createLiveFaceitClient, createMockProfile, withCache, type FaceitClient } from './faceit'
import { HttpError } from './errors'

const silentLogger = new Proxy({}, { get: () => () => {} }) as FastifyBaseLogger

const isHttpError = (statusCode: number, code: string) => (error: unknown) =>
  error instanceof HttpError && error.statusCode === statusCode && error.code === code

describe('mock FACEIT', () => {
  it('goodlifeee — профиль из макета', () => {
    const profile = createMockProfile('goodlifeee')
    assert.equal(profile.level, 9)
    assert.equal(profile.elo, 1809)
    assert.deepEqual(profile.stats, { matches: 1248, winRate: 54, kd: 1.18, headshots: 47 })
  })

  it('notfound — player_not_found', () => {
    assert.throws(() => createMockProfile('notfound'), isHttpError(404, 'player_not_found'))
  })

  it('детерминирован и правдоподобен', () => {
    const first = createMockProfile('s1mple')
    assert.deepEqual(createMockProfile('S1MPLE'), { ...first, nickname: 'S1MPLE' })
    assert.ok(first.elo >= 600 && first.elo <= 2400)
    assert.equal(first.level, getLevelByElo(first.elo))
  })
})

function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input)
    const key = Object.keys(routes).find((prefix) => url.includes(prefix))
    if (!key) throw new TypeError('fetch failed')
    return routes[key]!()
  }) as typeof fetch
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

const playerBody = {
  player_id: 'abc-123',
  nickname: 'GoodLifeee',
  avatar: '',
  country: 'RU',
  games: { cs2: { skill_level: 9, faceit_elo: 1809 } },
}

describe('live FACEIT', () => {
  it('собирает профиль и статистику', async () => {
    const client = createLiveFaceitClient({
      apiKey: 'key',
      logger: silentLogger,
      fetchImpl: fakeFetch({
        '/stats/cs2': () =>
          json({ lifetime: { Matches: '1248', 'Win Rate %': '54', 'Average K/D Ratio': '1.18', 'Average Headshots %': '47' } }),
        '/players?': () => json(playerBody),
      }),
    })
    assert.deepEqual(await client.getPlayer('goodlifeee'), {
      playerId: 'abc-123',
      nickname: 'GoodLifeee',
      avatarUrl: null,
      country: 'ru',
      level: 9,
      elo: 1809,
      stats: { matches: 1248, winRate: 54, kd: 1.18, headshots: 47 },
      source: 'faceit',
    })
  })

  it('без статистики — stats: null', async () => {
    const client = createLiveFaceitClient({
      apiKey: 'key',
      logger: silentLogger,
      fetchImpl: fakeFetch({ '/stats/cs2': () => json({}, 500), '/players?': () => json(playerBody) }),
    })
    assert.equal((await client.getPlayer('goodlifeee')).stats, null)
  })

  it('404 и отсутствие CS2 — player_not_found, 5xx и сеть — faceit_unavailable', async () => {
    const make = (routes: Record<string, () => Response>) =>
      createLiveFaceitClient({ apiKey: 'key', logger: silentLogger, fetchImpl: fakeFetch(routes) })

    await assert.rejects(make({ '/players?': () => json({}, 404) }).getPlayer('x1'), isHttpError(404, 'player_not_found'))
    await assert.rejects(
      make({ '/players?': () => json({ ...playerBody, games: { csgo: {} } }) }).getPlayer('x1'),
      (error: unknown) => isHttpError(404, 'player_not_found')(error) && (error as Error).message === 'У игрока нет CS2 на FACEIT',
    )
    await assert.rejects(make({ '/players?': () => json({}, 503) }).getPlayer('x1'), isHttpError(502, 'faceit_unavailable'))
    await assert.rejects(make({}).getPlayer('x1'), isHttpError(502, 'faceit_unavailable'))
  })
})

describe('кэш FACEIT', () => {
  it('отдаёт закэшированный профиль по нику без учёта регистра и забывает его по TTL', async () => {
    let calls = 0
    let time = 0
    const inner: FaceitClient = {
      async getPlayer(nickname) {
        calls++
        return createMockProfile(nickname)
      },
    }
    const client = withCache(inner, 60_000, () => time)
    await client.getPlayer('s1mple')
    await client.getPlayer('S1mple')
    assert.equal(calls, 1)
    time = 61_000
    await client.getPlayer('s1mple')
    assert.equal(calls, 2)
  })

  it('ошибки не кэширует', async () => {
    let calls = 0
    const client = withCache({
      async getPlayer() {
        calls++
        throw new Error('boom')
      },
    })
    await assert.rejects(client.getPlayer('a1'))
    await assert.rejects(client.getPlayer('a1'))
    assert.equal(calls, 2)
  })
})
