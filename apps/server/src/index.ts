import { PrismaClient } from '@prisma/client'
import { buildApp, createFastify } from './app'
import { createTelegram } from './bot'
import { FONTS_DIR, loadConfig } from './config'
import { createFaceitClient } from './faceit'
import { OrderService } from './orders'
import { createPrintRenderer } from './print'

const config = loadConfig()
const app = createFastify(config)
const log = app.log

if (config.devAuthBypass) {
  log.warn('DEV_AUTH_BYPASS включён: принимается `Authorization: tma dev:<id>`. В проде так нельзя!')
}
log.info(
  {
    botMode: config.botMode,
    paymentsMode: config.paymentsMode,
    faceitMode: config.faceitMode,
    admins: [...config.adminIds],
  },
  'Конфигурация',
)

const prisma = new PrismaClient({ datasourceUrl: config.databaseUrl })
const faceit = createFaceitClient({ mode: config.faceitMode, apiKey: config.faceitApiKey }, log)
const telegram = createTelegram(config, log)
const orders = new OrderService({ prisma, faceit, telegram, paymentsMode: config.paymentsMode, logger: log })
const print = createPrintRenderer({ fontsDir: FONTS_DIR, logger: log })
telegram.registerOrderHandlers(orders)

await buildApp(app, { config, orders, faceit, telegram, print })

let isShuttingDown = false
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true
  log.info({ signal }, 'Останавливаюсь')
  const forceExit = setTimeout(() => process.exit(1), 10_000)
  forceExit.unref()
  try {
    await telegram.stop()
    await app.close()
    await prisma.$disconnect()
    process.exit(0)
  } catch (error) {
    log.error({ err: error }, 'Ошибка при остановке')
    process.exit(1)
  }
}
process.once('SIGINT', () => void shutdown('SIGINT'))
process.once('SIGTERM', () => void shutdown('SIGTERM'))

try {
  await prisma.$connect()
  await app.listen({ port: config.port, host: config.host })
  await telegram.start()
} catch (error) {
  log.error({ err: error }, 'Не удалось запустить сервер')
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
}
