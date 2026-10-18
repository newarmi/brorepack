import { z } from 'zod'
import { DISPLAY_NAME_MAX } from './catalog'
import { FACEIT_NICKNAME_PATTERN } from './faceit'

// Одни и те же схемы валидируют форму на клиенте и тело запроса на сервере.

export const TEMPLATE_IDS = ['graphite', 'dead_silence', 'blue_skin', 'bloodsport', 'tech', 'orange', 'custom'] as const
export const PLAQUE_SIZES = ['A5'] as const
export const DELIVERY_METHOD_IDS = ['cdek_pvz', 'courier'] as const
export const ORDER_STATUSES = ['awaiting_payment', 'paid', 'printing', 'shipped', 'delivered', 'cancelled'] as const
// Полный адрес из геокодера бывает длиннее 200 символов
export const DELIVERY_ADDRESS_MAX = 300

export const nicknameSchema = z
  .string()
  .trim()
  .regex(FACEIT_NICKNAME_PATTERN, 'Ник FACEIT — латиница, цифры, «-» и «_»')

export const phoneSchema = z
  .string()
  .trim()
  .refine((value) => {
    const digits = value.replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 15
  }, 'Проверь номер телефона')

// Подписи с цифрами («for reaching 9 lvl 1809 elo») во входе нет: сервер собирает её сам
// из профиля FACEIT, чтобы на плашку нельзя было вписать чужой или выдуманный рейтинг
export const designInputSchema = z.object({
  templateId: z.enum(TEMPLATE_IDS),
  size: z.enum(PLAQUE_SIZES),
  displayName: z.string().trim().min(1, 'Добавь надпись').max(DISPLAY_NAME_MAX),
})

export const createOrderInputSchema = z.object({
  /** Уровень и ELO сервер берёт из FACEIT по нику, с клиента их не принимает */
  nickname: nicknameSchema,
  design: designInputSchema,
  extras: z.object({
    lightStand: z.boolean(),
  }),
  delivery: z.object({
    method: z.enum(DELIVERY_METHOD_IDS),
    // Город приходит из геокодера; при ручном вводе адреса он пустой
    city: z.string().trim().max(64),
    address: z.string().trim().min(3, 'Укажи адрес или пункт выдачи').max(DELIVERY_ADDRESS_MAX),
    // null — адрес введён вручную; optional — для клиентов, открытых до появления координат
    location: z
      .object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) })
      .nullable()
      .optional(),
  }),
  recipient: z.object({
    name: z.string().trim().min(2, 'Укажи имя получателя').max(80),
    phone: phoneSchema,
  }),
  comment: z.string().trim().max(500).optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  trackingNumber: z.string().trim().max(64).nullable().optional(),
})

export type DesignInput = z.infer<typeof designInputSchema>
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
