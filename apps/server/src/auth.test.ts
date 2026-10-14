import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { describe, it } from 'node:test'
import { authenticate, validateInitData, type AuthOptions } from './auth'

const BOT_TOKEN = '123456789:TEST-token_for-unit-tests'
const NOW = 1_760_000_000_000

function signInitData(fields: Record<string, string>, botToken = BOT_TOKEN): string {
  const dataCheckString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join('\n')
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  return new URLSearchParams({ ...fields, hash }).toString()
}

const user = { id: 5_000_000_001, first_name: 'Лёха', username: 'goodlifeee', language_code: 'ru' }
const freshFields = {
  query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
  user: JSON.stringify(user),
  auth_date: String(Math.floor(NOW / 1000) - 60),
  signature: 'some-ed25519-signature',
}

const options: AuthOptions = { botToken: BOT_TOKEN, devAuthBypass: false, adminIds: new Set([1]), now: () => NOW }

describe('validateInitData', () => {
  it('принимает корректно подписанные данные и достаёт пользователя', () => {
    const result = validateInitData(signInitData(freshFields), BOT_TOKEN, { now: () => NOW })
    assert.deepEqual(result, { id: user.id, firstName: 'Лёха', username: 'goodlifeee' })
  })

  it('отклоняет подделанный hash', () => {
    const initData = new URLSearchParams(signInitData(freshFields))
    initData.set('hash', '0'.repeat(64))
    assert.equal(validateInitData(initData.toString(), BOT_TOKEN, { now: () => NOW }), null)
  })

  it('отклоняет изменённые поля', () => {
    const initData = new URLSearchParams(signInitData(freshFields))
    initData.set('user', JSON.stringify({ ...user, id: 1 }))
    assert.equal(validateInitData(initData.toString(), BOT_TOKEN, { now: () => NOW }), null)
  })

  it('отклоняет подпись чужим токеном', () => {
    const initData = signInitData(freshFields, '987654321:another-token')
    assert.equal(validateInitData(initData, BOT_TOKEN, { now: () => NOW }), null)
  })

  it('отклоняет auth_date старше суток', () => {
    const stale = { ...freshFields, auth_date: String(Math.floor(NOW / 1000) - 25 * 60 * 60) }
    assert.equal(validateInitData(signInitData(stale), BOT_TOKEN, { now: () => NOW }), null)
  })

  it('отклоняет данные без hash и без user', () => {
    assert.equal(validateInitData('auth_date=1&user=%7B%7D', BOT_TOKEN, { now: () => NOW }), null)
    const { user: _user, ...withoutUser } = freshFields
    assert.equal(validateInitData(signInitData(withoutUser), BOT_TOKEN, { now: () => NOW }), null)
  })
})

describe('authenticate', () => {
  it('принимает заголовок `tma <initData>`', () => {
    const result = authenticate(`tma ${signInitData(freshFields)}`, options)
    assert.equal(result?.id, user.id)
  })

  it('без заголовка или с другой схемой — null', () => {
    assert.equal(authenticate(undefined, options), null)
    assert.equal(authenticate(`Bearer ${signInitData(freshFields)}`, options), null)
  })

  it('dev:<id> принимается только с DEV_AUTH_BYPASS', () => {
    assert.equal(authenticate('tma dev:42', options), null)
    assert.deepEqual(authenticate('tma dev:42', { ...options, devAuthBypass: true }), {
      id: 42,
      firstName: 'Dev',
      username: 'dev',
    })
  })

  it('dev-обход не ломает проверку настоящей initData', () => {
    const result = authenticate(`tma ${signInitData(freshFields)}`, { ...options, devAuthBypass: true })
    assert.equal(result?.id, user.id)
    assert.equal(authenticate('tma dev:abc', { ...options, devAuthBypass: true }), null)
  })

  it('без BOT_TOKEN настоящую initData проверить нельзя', () => {
    assert.equal(authenticate(`tma ${signInitData(freshFields)}`, { ...options, botToken: null }), null)
  })
})
