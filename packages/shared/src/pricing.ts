import { LIGHT_STAND, getDeliveryMethod, getSize, getTemplate } from './catalog'
import type { DeliveryMethod, OrderExtras, PlaqueSize, PriceBreakdown, PriceLine, TemplateId } from './types'

export interface PriceInput {
  templateId: TemplateId
  size: PlaqueSize
  extras: OrderExtras
  /** Без способа доставки считается только плашка с допами (экран конструктора) */
  deliveryMethod?: DeliveryMethod
}

export function calcPrice(input: PriceInput): PriceBreakdown {
  const size = getSize(input.size)
  const template = getTemplate(input.templateId)
  const lines: PriceLine[] = [{ code: 'plaque', label: `Плашка ${size.label}`, amount: size.price }]

  if (template.extraPrice > 0) {
    lines.push({ code: 'custom_design', label: template.name, amount: template.extraPrice })
  }
  if (input.extras.lightStand) {
    lines.push({ code: 'light_stand', label: LIGHT_STAND.label, amount: LIGHT_STAND.price })
  }
  if (input.deliveryMethod) {
    const delivery = getDeliveryMethod(input.deliveryMethod)
    lines.push({ code: 'delivery', label: `Доставка: ${delivery.label}`, amount: delivery.price })
  }

  return { lines, total: lines.reduce((sum, line) => sum + line.amount, 0) }
}
