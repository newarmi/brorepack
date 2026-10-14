import type { DeliveryMethod, OrderStatus, PlaqueSize, TemplateId } from './types'

// Цены — заглушки, владелец меняет их здесь. Сервер берёт суммы отсюда же,
// поэтому витрина и оплата никогда не разъедутся.

export interface TemplatePalette {
  /** Основной цвет шапки */
  primary: string
  /** Диагональные полосы */
  secondary: string
  /** Акценты: пунктир, шевроны */
  highlight: string
  /** Фон плашки */
  base: string
}

export interface TemplateDef {
  id: TemplateId
  name: string
  palette: TemplatePalette
  /** Доплата за шаблон, ₽ */
  extraPrice: number
  description?: string
}

export interface SizeDef {
  id: PlaqueSize
  label: string
  dimensions: string
  price: number
}

export interface DeliveryDef {
  id: DeliveryMethod
  label: string
  eta: string
  price: number
}

const BLUE_PALETTE: TemplatePalette = { primary: '#2F8CFF', secondary: '#1550C0', highlight: '#7FD3FF', base: '#060A14' }

export const TEMPLATES: TemplateDef[] = [
  { id: 'blue', name: 'Blue Ninja', palette: BLUE_PALETTE, extraPrice: 0 },
  { id: 'red', name: 'Red Rage', palette: { primary: '#FF3B4E', secondary: '#A0102A', highlight: '#FFB08A', base: '#12060A' }, extraPrice: 0 },
  { id: 'mono', name: 'Mono', palette: { primary: '#E6EBF3', secondary: '#8A96AE', highlight: '#FFFFFF', base: '#0A0C11' }, extraPrice: 0 },
  {
    id: 'custom',
    name: 'Свой дизайн',
    palette: BLUE_PALETTE,
    extraPrice: 990,
    description: 'Дизайнер подготовит макет по твоим пожеланиям и пришлёт в чат',
  },
]

export const SIZES: SizeDef[] = [
  { id: 'A5', label: 'A5', dimensions: '15 × 21 см', price: 2490 },
]

/** Единственный формат, который сейчас производится */
export const DEFAULT_SIZE: PlaqueSize = 'A5'

export const LIGHT_STAND = {
  label: 'Подставка с подсветкой',
  description: 'RGB-основание, USB-C',
  price: 590,
}

export const DELIVERY_METHODS: DeliveryDef[] = [
  { id: 'cdek_pvz', label: 'Пункт СДЭК', eta: '3–5 дней', price: 390 },
  { id: 'courier', label: 'Курьер', eta: '2–4 дня', price: 590 },
]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Ждёт оплаты',
  paid: 'Оплачен',
  printing: 'В печати',
  shipped: 'Отправлен',
  delivered: 'Получен',
  cancelled: 'Отменён',
}

/** Порядок статусов в таймлайне заказа (отмена — вне таймлайна) */
export const ORDER_TIMELINE: OrderStatus[] = ['paid', 'printing', 'shipped', 'delivered']

/** Номер заказа для людей = id + смещение, чтобы первый заказ не был «№1» */
export const ORDER_NUMBER_OFFSET = 1000

export const DISPLAY_NAME_MAX = 24
export const CAPTION_MAX = 40

export function getTemplate(id: TemplateId): TemplateDef {
  const template = TEMPLATES.find((item) => item.id === id)
  if (!template) throw new Error(`Unknown template: ${id}`)
  return template
}

export function getSize(id: PlaqueSize): SizeDef {
  const size = SIZES.find((item) => item.id === id)
  if (!size) throw new Error(`Unknown size: ${id}`)
  return size
}

export function getDeliveryMethod(id: DeliveryMethod): DeliveryDef {
  const method = DELIVERY_METHODS.find((item) => item.id === id)
  if (!method) throw new Error(`Unknown delivery method: ${id}`)
  return method
}

export function formatOrderNumber(id: number): string {
  return String(id + ORDER_NUMBER_OFFSET)
}

/** 2880 → «2 880 ₽» (узкий неразрывный пробел) */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('ru-RU').replace(/\s/g, ' ')} ₽`
}
