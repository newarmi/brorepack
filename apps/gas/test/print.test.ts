import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CreateOrderResponse } from '@brorepack/shared'
import { FakeBlob } from './gas-env'
import { BOT_PROPERTIES, DEV_PROPERTIES, createGas, orderInput } from './harness'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297"><text>Леха Гей</text></svg>'

/** Минимальный PNG: сигнатура + IHDR 1748×2480 (A5 при 300 dpi) + немного «данных» */
function fakePng(width = 1748, height = 2480): Buffer {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(25)
  ihdr.writeUInt32BE(13, 0)
  ihdr.write('IHDR', 4, 'latin1')
  ihdr.writeUInt32BE(width, 8)
  ihdr.writeUInt32BE(height, 12)
  ihdr.writeUInt8(8, 16)
  ihdr.writeUInt8(6, 17)
  return Buffer.concat([header, ihdr, Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255])])
}

function printFiles() {
  return [
    { name: 'brorepack-1001.svg', mimeType: 'image/svg+xml', base64: Buffer.from(SVG, 'utf8').toString('base64') },
    { name: 'brorepack-1001.png', mimeType: 'image/png', base64: fakePng().toString('base64') },
  ]
}

function seed(properties: Record<string, string> = { ...DEV_PROPERTIES, ...BOT_PROPERTIES }) {
  const gas = createGas({ properties })
  const order = gas.api<CreateOrderResponse>('orders.create', orderInput(), 'dev:7').data.order
  gas.api('orders.mockPay', { id: order.id }, 'dev:7')
  gas.telegram?.clear()
  return { ...gas, order }
}

describe('admin.orders.sendPrint', () => {
  it('пересылает файлы админу документами (multipart с Blob)', () => {
    const { api, telegram, order, env } = seed()
    const result = api('admin.orders.sendPrint', { id: order.id, files: printFiles() }, 'dev:1')
    assert.deepEqual(result, { ok: true, data: { ok: true } })

    const documents = telegram!.byMethod('sendDocument')
    assert.equal(documents.length, 2)
    for (const call of documents) {
      assert.equal(call.contentType, undefined, 'multipart собирает сам UrlFetchApp — contentType не задаём')
      assert.equal(call.payload.chat_id, '1', 'файлы получает запросивший админ')
      assert.ok(call.payload.document instanceof FakeBlob)
      // Кириллица подписи — в URL (UTF-8), в multipart-теле только файл
      assert.deepEqual(Object.keys(call.query).sort(), ['caption', 'chat_id'])
    }
    const [svg, png] = documents
    assert.equal(svg!.payload.document.getName(), 'brorepack-1001.svg')
    assert.equal(svg!.payload.document.getContentType(), 'image/svg+xml')
    assert.equal(svg!.payload.document.getDataAsString(), SVG)
    assert.equal(svg!.payload.caption, `Заказ №${order.number}: A5, «Леха Гей»\nSVG в размер 15 × 21 см, шрифты вшиты`)

    assert.equal(png!.payload.document.getName(), 'brorepack-1001.png')
    assert.equal(png!.payload.document.getContentType(), 'image/png')
    assert.deepEqual(png!.payload.document.bytes, fakePng())
    assert.equal(png!.payload.caption, `Заказ №${order.number}: A5, «Леха Гей»\nPNG 1748×2480, 300 dpi`)

    // Сам запрос к Telegram — POST с Blob в payload (UrlFetchApp → multipart/form-data)
    const fetchCall = env.urlFetch.calls.find((call) => call.url.includes('/sendDocument?'))!
    assert.equal(fetchCall.params.method, 'post')
    assert.equal(fetchCall.params.muteHttpExceptions, true)
    assert.deepEqual(Object.keys(fetchCall.params.payload), ['document'])
  })

  it('принимает data:-URL и один файл; имя файла в multipart — только ASCII', () => {
    const { api, telegram, order } = seed()
    const [svg] = printFiles()
    const result = api(
      'admin.orders.sendPrint',
      { id: String(order.id), files: [{ ...svg, name: 'плашка 1001.svg', base64: `data:image/svg+xml;base64,${svg!.base64}` }] },
      'dev:1',
    )
    assert.equal(result.ok, true, JSON.stringify(result))
    const [document] = telegram!.byMethod('sendDocument')
    assert.equal(document!.payload.document.getName(), '_1001.svg')
  })

  it('503 bot_unavailable без BOT_TOKEN', () => {
    const { api, order } = seed(DEV_PROPERTIES)
    assert.deepEqual(api('admin.orders.sendPrint', { id: order.id, files: printFiles() }, 'dev:1'), {
      ok: false,
      status: 503,
      error: 'bot_unavailable',
      message: 'Бот выключен — скачай файлы для печати по ссылкам',
    })
  })

  it('отклоняет плохие файлы', () => {
    const { api, telegram, order } = seed()
    const [svg, png] = printFiles()
    const send = (files: unknown) => api('admin.orders.sendPrint', { id: order.id, files }, 'dev:1')
    const expectInvalid = (files: unknown, path: string, message?: RegExp) => {
      const result = send(files)
      assert.equal(result.ok, false, JSON.stringify(result))
      assert.equal(result.status, 400)
      assert.equal(result.error, 'validation_error')
      assert.ok(
        result.issues?.some((issue) => issue.path === path && (!message || message.test(issue.message))),
        `ожидалась ошибка в ${path}: ${JSON.stringify(result.issues)}`,
      )
    }

    expectInvalid([svg, png, svg], 'files', /Не больше 2 файлов/)
    expectInvalid([], 'files', /Нет файлов/)
    expectInvalid(undefined, 'files')
    expectInvalid([{ ...svg, name: 'print.pdf' }], 'files.0.name', /\.svg или \.png/)
    expectInvalid([{ ...svg, name: '../../etc/passwd.svg' }], 'files.0.name')
    expectInvalid([{ ...png, mimeType: 'application/pdf' }], 'files.0.mimeType')
    expectInvalid([{ ...png, mimeType: 'image/svg+xml' }], 'files.0.mimeType', /не совпадает/)
    expectInvalid([{ ...svg, base64: 'это не base64!' }], 'files.0.base64', /base64/)
    expectInvalid([{ ...png, base64: '' }], 'files.0.base64')
    // Чуть больше 10 МБ после декодирования
    const tooBig = Buffer.alloc(10 * 1024 * 1024 + 1, 1).toString('base64')
    expectInvalid([{ ...png, base64: tooBig }], 'files.0.base64', /10 МБ/)
    // Заведомо огромная строка отсекается до декодирования
    expectInvalid([{ ...png, base64: 'A'.repeat(14_000_000) }], 'files.0.base64', /10 МБ/)
    // base64 правильного алфавита, но битой длины — Utilities.base64Decode бросает
    expectInvalid([{ ...png, base64: 'AAAAA' }], 'files.0.base64', /повреждён/)

    assert.equal(telegram!.byMethod('sendDocument').length, 0)
  })

  it('доступ, несуществующий заказ, ошибка Telegram', () => {
    const { api, telegram, order } = seed()
    assert.equal(api('admin.orders.sendPrint', { id: order.id, files: printFiles() }, 'dev:7').status, 403)
    assert.deepEqual(api('admin.orders.sendPrint', { id: 999, files: printFiles() }, 'dev:1'), {
      ok: false,
      status: 404,
      error: 'not_found',
      message: 'Заказ не найден',
    })

    telegram!.failures.set('sendDocument', { code: 400, description: 'Bad Request: chat not found' })
    assert.deepEqual(api('admin.orders.sendPrint', { id: order.id, files: printFiles() }, 'dev:1'), {
      ok: false,
      status: 502,
      error: 'telegram_error',
      message: 'Бот не смог прислать файлы. Напиши боту /start и попробуй снова',
    })
  })
})
