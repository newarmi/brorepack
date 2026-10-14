// Локальный эмулятор веб-приложения Apps Script: собранный dist/Code.js в той же песочнице, что и в
// тестах (только ECMAScript + фейки сервисов Google), за HTTP-сервером. Нужен, чтобы гонять фронт
// с VITE_API_TRANSPORT=gas без Google-аккаунта. Таблица живёт в памяти, режимы — mock.
//
// Как настоящий Apps Script: отвечает 200 с JSON и `Access-Control-Allow-Origin: *`,
// а CORS-preflight (OPTIONS) не поддерживает — если фронт пошлёт «непростой» запрос, это всплывёт здесь.
import { createServer } from 'node:http'
import { DEV_PROPERTIES, createGas, postEvent } from '../test/harness'

const PORT = Number(process.env.PORT ?? 8787)

const gas = createGas({ properties: { ...DEV_PROPERTIES }, withTelegram: false, withFaceit: false })

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`)

  if (url.pathname !== '/exec') {
    response.writeHead(404).end()
    return
  }
  if (request.method === 'OPTIONS') {
    console.warn('OPTIONS-запрос: настоящий Apps Script не отвечает на CORS-preflight — фронт должен слать text/plain без своих заголовков')
    response.writeHead(405).end()
    return
  }

  const chunks: Buffer[] = []
  request.on('data', (chunk: Buffer) => chunks.push(chunk))
  request.on('end', () => {
    const parameters = Object.fromEntries(url.searchParams)
    const output =
      request.method === 'POST'
        ? gas.gas.doPost(postEvent(Buffer.concat(chunks).toString('utf8'), parameters))
        : gas.gas.doGet({ parameter: parameters })
    response.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    })
    response.end(output.getContent())
  })
})

server.listen(PORT, () => {
  console.log(`Эмулятор Apps Script: http://localhost:${PORT}/exec (dev:1 — админ, оплата и FACEIT — mock)`)
})
