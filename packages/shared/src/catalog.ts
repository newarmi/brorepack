import type { DeliveryMethod, OrderStatus, PlaqueSize, TemplateArtId, TemplateId } from './types'

// Цены — заглушки, владелец меняет их здесь. Сервер берёт суммы отсюда же,
// поэтому витрина и оплата никогда не разъедутся.

/**
 * Цвет, который зависит от уровня игрока:
 * - строка — один цвет на все уровни;
 * - 'faceit' — фирменный цвет уровня (getLevelColor);
 * - { low, high } — свой цвет до 7 уровня включительно и с 8-го.
 *   В макетах есть только 7 и 9 уровень; цвета для 1–3 и 10 уточняются у дизайнера
 */
export type LevelColorRule = string | 'faceit' | { low: string; high: string }

export interface TemplateDef {
  id: TemplateId
  name: string
  /** Файл арта в packages/shared/assets/plaques: фон, стрелка и знак FACEIT из макета дизайнера */
  artId: TemplateArtId
  /** Цвет фона, пока арт не загрузился */
  baseColor: string
  /** Цифра уровня, ник и подпись */
  textColor: string
  /** Кольцо уровня */
  ringColor: LevelColorRule
  /** Звезда в знаке FACEIT */
  starColor: LevelColorRule
  /** Свечение вокруг плашки в приложении */
  glowColor: string
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

// Цвета сняты с макетов FACEIT_A5_*.pdf (страницы 7 и 9 уровня)
export const TEMPLATES: TemplateDef[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    artId: 'graphite',
    baseColor: '#262626',
    textColor: '#FFFFFF',
    ringColor: 'faceit',
    starColor: '#FF5500',
    glowColor: '#FF5500',
    extraPrice: 0,
  },
  {
    id: 'dead_silence',
    name: 'Dead Silence',
    artId: 'dead_silence',
    baseColor: '#0B0B0B',
    textColor: '#FAFAFA',
    ringColor: { low: '#D1D1D1', high: '#FAFAFA' },
    starColor: '#FAFAFA',
    glowColor: '#FFFFFF',
    extraPrice: 0,
  },
  {
    id: 'blue_skin',
    name: 'Blue Skin',
    artId: 'blue_skin',
    baseColor: '#0D1B36',
    textColor: '#F5FCFF',
    ringColor: { low: '#6ED6FF', high: '#32A9EC' },
    starColor: { low: '#6ED6FF', high: '#32A9EC' },
    glowColor: '#32A9EC',
    extraPrice: 0,
  },
  {
    id: 'bloodsport',
    name: 'Bloodsport',
    artId: 'bloodsport',
    baseColor: '#16181C',
    textColor: '#FFFFFF',
    ringColor: 'faceit',
    starColor: '#FF5500',
    glowColor: '#FF2D2D',
    extraPrice: 0,
  },
  {
    id: 'tech',
    name: 'Tech',
    artId: 'tech',
    baseColor: '#151515',
    textColor: '#FAFAFA',
    ringColor: { low: '#4FBAD1', high: '#DE8FB5' },
    starColor: { low: '#4FBAD1', high: '#DE8FB5' },
    glowColor: '#9FC9E0',
    extraPrice: 0,
  },
  {
    id: 'orange',
    name: 'Orange',
    artId: 'orange',
    baseColor: '#FF5500',
    textColor: '#000000',
    ringColor: '#000000',
    starColor: '#000000',
    glowColor: '#FF5500',
    extraPrice: 0,
  },
  {
    id: 'custom',
    name: 'Свой дизайн',
    // Пока дизайнер не нарисовал макет, превью показывает Graphite
    artId: 'graphite',
    baseColor: '#262626',
    textColor: '#FFFFFF',
    ringColor: 'faceit',
    starColor: '#FF5500',
    glowColor: '#FF5500',
    extraPrice: 990,
    description: 'Дизайнер подготовит макет по твоим пожеланиям и пришлёт в чат',
  },
]

/** Шаблоны первой версии (Blue Ninja, Red Rage, Mono) встречаются в старых заказах — рисуем их ближайшими новыми */
const LEGACY_TEMPLATE_ALIASES: Record<string, TemplateId> = {
  blue: 'blue_skin',
  red: 'bloodsport',
  mono: 'tech',
}

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

/** Шаблон по id; id из старых заказов переводится в новый */
export function getTemplate(id: TemplateId): TemplateDef {
  const resolvedId = LEGACY_TEMPLATE_ALIASES[id] ?? id
  const template = TEMPLATES.find((item) => item.id === resolvedId)
  if (!template) throw new Error(`Unknown template: ${id}`)
  return template
}

/** Сохранённое значение → актуальный id шаблона; неизвестное — null */
export function normalizeTemplateId(value: unknown): TemplateId | null {
  if (typeof value !== 'string') return null
  const resolvedId = LEGACY_TEMPLATE_ALIASES[value] ?? value
  return TEMPLATES.some((item) => item.id === resolvedId) ? (resolvedId as TemplateId) : null
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
