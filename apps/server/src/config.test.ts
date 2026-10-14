import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadConfig } from './config'

describe('config: только настоящие данные в проде', () => {
  it('по умолчанию FACEIT — live и требует ключ', () => {
    assert.throws(() => loadConfig({}), /FACEIT_API_KEY/)
    assert.equal(loadConfig({ FACEIT_API_KEY: 'key' }).faceitMode, 'live')
  })

  it('заглушка FACEIT — только явно', () => {
    assert.equal(loadConfig({ FACEIT_MODE: 'mock' }).faceitMode, 'mock')
  })

  it('в проде нельзя заглушки FACEIT и оплаты', () => {
    const production = { NODE_ENV: 'production', FACEIT_API_KEY: 'key' }
    assert.throws(() => loadConfig({ ...production, FACEIT_MODE: 'mock' }), /FACEIT_MODE=mock/)
    assert.throws(() => loadConfig({ ...production, PAYMENTS_MODE: 'mock' }), /PAYMENTS_MODE=mock/)
  })
})
