export type TemplateId = 'graphite' | 'dead_silence' | 'blue_skin' | 'bloodsport' | 'tech' | 'orange' | 'custom'
/** Арт шаблона: файл packages/shared/assets/plaques/<id>.svg (и .preview.svg) */
export type TemplateArtId = Exclude<TemplateId, 'custom'>
/** Формат плашки. Сейчас производится только A5 */
export type PlaqueSize = 'A5'
export type DeliveryMethod = 'cdek_pvz' | 'courier'
export type OrderStatus = 'awaiting_payment' | 'paid' | 'printing' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentMode = 'telegram' | 'mock'
/** faceit — настоящие данные из FACEIT Data API, mock — заглушка для разработки */
export type FaceitDataSource = 'faceit' | 'mock'

export interface FaceitStats {
  matches: number
  /** Процент побед, 0–100 */
  winRate: number
  kd: number
  /** Процент хедшотов, 0–100 */
  headshots: number
}

export interface FaceitProfile {
  playerId: string
  nickname: string
  avatarUrl: string | null
  /** ISO-код страны в нижнем регистре, например "ru" */
  country: string | null
  level: number
  elo: number
  stats: FaceitStats | null
  /** Откуда цифры: интерфейс помечает заглушку, чтобы её не приняли за настоящий рейтинг */
  source: FaceitDataSource
}

/** Всё, что нужно, чтобы нарисовать плашку */
export interface PlaqueDesign {
  templateId: TemplateId
  size: PlaqueSize
  /** Крупная надпись на плашке, по умолчанию — ник */
  displayName: string
  /** Подпись под ником, по умолчанию «for reaching 9 lvl 1809 elo» */
  caption: string
  /** 0 — уровень ещё неизвестен: превью на экране ввода ника */
  level: number
  elo: number
}

export interface OrderExtras {
  lightStand: boolean
}

export interface OrderDelivery {
  method: DeliveryMethod
  city: string
  address: string
}

export interface OrderRecipient {
  name: string
  phone: string
}

/** Суммы — в целых рублях */
export interface PriceLine {
  code: string
  label: string
  amount: number
}

export interface PriceBreakdown {
  lines: PriceLine[]
  total: number
}

export interface OrderCustomer {
  telegramId: number
  username: string | null
  firstName: string
}

export interface Order {
  id: number
  /** Номер для людей: «1042» */
  number: string
  status: OrderStatus
  faceitPlayerId: string
  faceitNickname: string
  design: PlaqueDesign
  extras: OrderExtras
  delivery: OrderDelivery
  recipient: OrderRecipient
  price: PriceBreakdown
  trackingNumber: string | null
  /** Пожелания клиента (для «Своего дизайна») */
  comment: string | null
  customer: OrderCustomer
  /** ISO 8601 */
  createdAt: string
  paidAt: string | null
  updatedAt: string
}

export interface MeResponse {
  user: {
    id: number
    firstName: string
    username: string | null
  }
  isAdmin: boolean
}

export interface CreateOrderResponse {
  order: Order
  /** Ссылка для Telegram.WebApp.openInvoice; null в режиме mock */
  invoiceUrl: string | null
  paymentMode: PaymentMode
}

export interface ApiError {
  error: string
  message?: string
  /** Для validation_error: какие поля не прошли проверку */
  issues?: { path: string; message: string }[]
}
