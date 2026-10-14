import type { Config } from './config'
import { createFaceitClient, type FaceitClient } from './faceit'
import { OrderService } from './orders'
import { OrderRepository } from './sheets'
import { createTelegramGateway, type TelegramGateway } from './telegram'

/** Всё, что нужно одному запросу. Apps Script не хранит состояние между запусками — собираем заново каждый раз */
export interface Services {
  config: Config
  repo: OrderRepository
  telegram: TelegramGateway
  faceit: () => FaceitClient
  orders: OrderService
}

export function createServices(config: Config): Services {
  const repo = new OrderRepository(config.spreadsheetId)
  const telegram = createTelegramGateway(config)
  let faceitClient: FaceitClient | null = null
  const faceit = () => (faceitClient ??= createFaceitClient(config))
  const orders = new OrderService({ repo, faceit, telegram, paymentsMode: config.paymentsMode })
  return { config, repo, telegram, faceit, orders }
}
