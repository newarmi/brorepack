import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import vm from 'node:vm'
import { FakeHtmlOutput, FakeTextOutput } from './gas-env'
import { BUNDLE_PATH, DEV_PROPERTIES, FORBIDDEN_GLOBALS, createGas, orderInput, postEvent } from './harness'

describe('песочница: dist/Code.js в рантайме, похожем на Apps Script', () => {
  it('объявляет точки входа функциями верхнего уровня', () => {
    const code = readFileSync(BUNDLE_PATH, 'utf8')
    for (const name of ['doGet', 'doPost', 'setup', 'setWebhook', 'deleteWebhook', 'setMenuButton', 'checkConfig']) {
      assert.match(code, new RegExp(`^function ${name}\\(`, 'm'), `нет function ${name}`)
    }
    assert.doesNotMatch(code, /^\s*(import|export)\s/m, 'в бандле не должно быть ES-модулей')
  })

  it('в контексте нет Node/Web API, но есть сервисы Apps Script', () => {
    const { context } = createGas({ withSheet: false })
    for (const name of FORBIDDEN_GLOBALS) {
      assert.equal(vm.runInContext(`typeof ${name}`, context), 'undefined', `${name} не должен быть доступен`)
    }
    assert.equal(vm.runInContext('typeof UrlFetchApp.fetch', context), 'function')
    assert.equal(vm.runInContext('typeof __brorepack.doPost', context), 'function')
    assert.throws(() => vm.runInContext('new Function("return 1")', context), /Code generation from strings disallowed/)
  })

  it('doGet и doPost health отвечают через верхнеуровневые функции', () => {
    const { gas } = createGas({ withSheet: false })
    const get = gas.doGet({ parameter: {} })
    assert.ok(get instanceof FakeTextOutput)
    assert.equal(get.getMimeType(), 'JSON')
    assert.deepEqual(JSON.parse(get.getContent()), { ok: true, data: { ok: true } })

    const post = gas.doPost(postEvent(JSON.stringify({ action: 'health' })))
    assert.ok(post instanceof FakeTextOutput)
    assert.deepEqual(JSON.parse(post.getContent()), { ok: true, data: { ok: true } })
  })

  it('zod с русскими сообщениями работает без eval', () => {
    const { api } = createGas({ properties: DEV_PROPERTIES })
    const result = api('orders.create', { ...orderInput(), extras: {} }, 'dev:7')
    assert.equal(result.ok, false)
    assert.equal(result.error, 'validation_error')
    assert.equal(result.issues?.[0]?.path, 'extras.lightStand')
    assert.match(result.message ?? '', /[А-Яа-яЁё]/, `сообщение не по-русски: ${result.message}`)
  })

  it('битый JSON и пустое тело не роняют doPost', () => {
    const { gas } = createGas({ withSheet: false })
    const broken = gas.doPost(postEvent('{oops'))
    assert.ok(broken instanceof FakeTextOutput)
    assert.deepEqual(JSON.parse(broken.getContent()), { ok: false, status: 400, error: 'bad_request', message: 'Некорректный JSON' })

    const empty = gas.doPost(postEvent(''))
    assert.ok(empty instanceof FakeTextOutput)
    assert.equal(JSON.parse(empty.getContent()).error, 'bad_request')

    const noEvent = gas.doPost(undefined)
    assert.ok(noEvent instanceof FakeTextOutput)
    assert.ok(!(noEvent instanceof FakeHtmlOutput))
  })
})
