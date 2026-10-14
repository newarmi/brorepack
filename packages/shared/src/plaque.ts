import { getTemplate } from './catalog'
import type { PlaqueDesign, PlaqueSize } from './types'

// Плашка рисуется одной функцией и для превью в приложении, и для файла в типографию.
// Холст — в миллиметрах формата A4 (пропорции A-форматов совпадают), печатается в масштабе под A5.

export const PLAQUE_VIEWBOX = { width: 210, height: 297 } as const

export const PLAQUE_PRINT_SIZE_MM: Record<PlaqueSize, { width: number; height: number }> = {
  A5: { width: 148, height: 210 },
}

export interface RenderPlaqueOptions {
  /** preview тянется по контейнеру, со скруглением и кантом акрила; print — размеры в мм, без канта */
  mode?: 'preview' | 'print'
  /** CSS с @font-face в base64, чтобы файл для печати был самодостаточным */
  embeddedFontCss?: string
  /** Префикс для id внутри SVG, если на странице несколько плашек */
  idPrefix?: string
}

export const PLAQUE_FONT_DISPLAY = "Unbounded, 'Arial Black', sans-serif"
export const PLAQUE_FONT_TEXT = "Onest, 'Helvetica Neue', Arial, sans-serif"

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

const round = (value: number) => Math.round(value * 100) / 100

/** Уменьшает кегль, если строка по грубой оценке не влезает в ширину */
function fitFontSize(text: string, baseSize: number, maxWidth: number, charWidthRatio: number): number {
  const estimatedWidth = text.length * baseSize * charWidthRatio
  return estimatedWidth > maxWidth ? round((baseSize * maxWidth) / estimatedWidth) : baseSize
}

export function renderPlaqueSvg(design: PlaqueDesign, options: RenderPlaqueOptions = {}): string {
  const { mode = 'preview', embeddedFontCss, idPrefix = 'plaque' } = options
  const { primary, secondary, highlight, base } = getTemplate(design.templateId).palette
  const w = PLAQUE_VIEWBOX.width
  const h = PLAQUE_VIEWBOX.height
  const k = w / 220
  const bandH = Math.round(h * 0.42)
  const clipId = `${idPrefix}-clip`

  // --- Шапка: полосы, стрелка, звезда, пунктир ---
  const band: string[] = [
    `<rect width="${w}" height="${bandH}" fill="${primary}"/>`,
    `<path d="M0 ${bandH} L${round(w * 0.42)} 0 L${round(w * 0.6)} 0 L${round(w * 0.18)} ${bandH} Z" fill="${secondary}" fill-opacity="0.6"/>`,
    `<path d="M${round(w * 0.72)} ${bandH} L${w} ${round(bandH * 0.3)} L${w} ${round(bandH * 0.58)} L${round(w * 0.86)} ${bandH} Z" fill="${secondary}" fill-opacity="0.55"/>`,
    `<path d="M${round(w * 0.26)} ${round(bandH * 0.5)} L${round(w * 0.84)} ${round(bandH * 0.18)} L${round(w * 0.78)} ${round(bandH * 0.86)} L${round(w * 0.58)} ${round(bandH * 0.58)} Z" fill="#FFFFFF"/>`,
    `<path d="M${round(w * 0.13)} ${round(bandH * 0.2)} l${round(3 * k)} ${round(7 * k)} l${round(7 * k)} ${round(3 * k)} l${round(-7 * k)} ${round(3 * k)} l${round(-3 * k)} ${round(7 * k)} l${round(-3 * k)} ${round(-7 * k)} l${round(-7 * k)} ${round(-3 * k)} l${round(7 * k)} ${round(-3 * k)} Z" fill="${base}"/>`,
    `<rect y="${round(bandH - 14 * k)}" width="${w}" height="${round(14 * k)}" fill="${base}"/>`,
  ]
  for (let x = 6 * k; x < w; x += 14 * k) {
    band.push(`<rect x="${round(x)}" y="${round(bandH - 9 * k)}" width="${round(8 * k)}" height="${round(3 * k)}" fill="${highlight}"/>`)
  }
  for (let x = 6 * k; x < w * 0.6; x += 10 * k) {
    band.push(`<rect x="${round(x)}" y="${round(8 * k)}" width="${round(5 * k)}" height="${round(2 * k)}" fill="#FFFFFF" fill-opacity="0.8"/>`)
  }

  // --- Центр: кольцо уровня, надпись, подпись. Группа центрируется между шапкой и низом ---
  const decoTop = h - 40 * k
  const ringSize = 56 * k
  const levelSize = 22 * k
  const nameBaseSize = 15 * k
  const captionBaseSize = 10 * k
  const groupHeight = ringSize + 10 * k + nameBaseSize + 5 * k + captionBaseSize
  const groupTop = bandH + (decoTop - bandH - groupHeight) / 2
  const cx = w / 2
  const cy = groupTop + ringSize / 2
  const ringStroke = (ringSize / 2) * 0.16
  const ringRadius = ringSize / 2 - ringStroke / 2
  // Дуга-«спидометр» с разрывом снизу: от 135° до 45° по часовой
  const arcStartX = cx + ringRadius * Math.cos(Math.PI * 0.75)
  const arcStartY = cy + ringRadius * Math.sin(Math.PI * 0.75)
  const arcEndX = cx + ringRadius * Math.cos(Math.PI * 0.25)
  const arcEndY = cy + ringRadius * Math.sin(Math.PI * 0.25)

  const maxTextWidth = w - 40 * k
  const nameSize = fitFontSize(design.displayName, nameBaseSize, maxTextWidth, 0.6)
  const captionSize = fitFontSize(design.caption, captionBaseSize, maxTextWidth, 0.52)
  const nameBaseline = groupTop + ringSize + 10 * k + nameBaseSize * 0.78
  const captionBaseline = nameBaseline + 5 * k + captionBaseSize * 0.95

  const center = [
    `<path d="M${round(arcStartX)} ${round(arcStartY)} A${round(ringRadius)} ${round(ringRadius)} 0 1 1 ${round(arcEndX)} ${round(arcEndY)}" stroke="${primary}" stroke-width="${round(ringStroke)}" fill="none"/>`,
    `<text x="${round(cx)}" y="${round(cy + levelSize * 0.36)}" text-anchor="middle" font-family="${PLAQUE_FONT_DISPLAY}" font-weight="700" font-size="${round(levelSize)}" fill="#FFFFFF">${design.level}</text>`,
    `<text x="${round(cx)}" y="${round(nameBaseline)}" text-anchor="middle" font-family="${PLAQUE_FONT_TEXT}" font-weight="600" font-size="${nameSize}" fill="#FFFFFF">${escapeXml(design.displayName)}</text>`,
  ]
  if (design.caption) {
    center.push(
      `<text x="${round(cx)}" y="${round(captionBaseline)}" text-anchor="middle" font-family="${PLAQUE_FONT_TEXT}" font-weight="400" font-size="${captionSize}" fill="#C9D3E6">${escapeXml(design.caption)}</text>`,
    )
  }

  // --- Низ: шевроны, марка, штрихкод ---
  const decoY = h - 36 * k
  const chevrons = [10, 20, 30]
    .map((x) => `M${round(x * k)} ${round(decoY + 8 * k)} l${round(7 * k)} ${round(7 * k)} l${round(-7 * k)} ${round(7 * k)}`)
    .join(' ')
  const bottom: string[] = [
    `<path d="${chevrons}" stroke="${highlight}" stroke-width="${round(2.4 * k)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  ]
  let barX = 0
  ;[1, 2, 1, 3, 1, 1, 2, 1, 3, 1, 2, 1, 1, 2].forEach((barWidth, index) => {
    if (index % 2 === 0) {
      bottom.push(`<rect x="${round(w - 46 * k + barX * k)}" y="${round(decoY + 9 * k)}" width="${round(barWidth * k)}" height="${round(12 * k)}" fill="#FFFFFF"/>`)
    }
    barX += barWidth + 1
  })
  const markSize = 9 * k
  bottom.push(
    `<text x="${round(cx)}" y="${round(h - 21 * k + markSize * 0.36)}" text-anchor="middle" font-family="${PLAQUE_FONT_DISPLAY}" font-weight="900" font-size="${round(markSize)}" letter-spacing="${round(markSize * 0.12)}" fill="#FFFFFF">BROREPACK</text>`,
  )

  // --- Сборка ---
  const isPrint = mode === 'print'
  const printSize = PLAQUE_PRINT_SIZE_MM[design.size]
  const sizeAttrs = isPrint ? `width="${printSize.width}mm" height="${printSize.height}mm"` : 'width="100%" height="100%"'
  // A5 чуть «выше» A4 по пропорциям: при печати заполняем лист целиком (slice срезает ~0.25 мм по бокам),
  // иначе сверху и снизу остаются прозрачные полосы
  const aspectRatio = isPrint ? 'xMidYMid slice' : 'xMidYMid meet'
  const cornerRadius = isPrint ? 0 : 4
  const defs = [`<clipPath id="${clipId}"><rect width="${w}" height="${h}" rx="${cornerRadius}"/></clipPath>`]
  if (embeddedFontCss) defs.push(`<style>${embeddedFontCss}</style>`)
  const edge = isPrint
    ? ''
    : `<rect x="0.6" y="0.6" width="${w - 1.2}" height="${h - 1.2}" rx="${cornerRadius}" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1.2"/>`
  const label = escapeXml(`Плашка: ${design.displayName}, ${design.level} уровень`)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ${sizeAttrs} preserveAspectRatio="${aspectRatio}" role="img" aria-label="${label}">`,
    `<defs>${defs.join('')}</defs>`,
    `<g clip-path="url(#${clipId})">`,
    `<rect width="${w}" height="${h}" fill="${base}"/>`,
    ...band,
    ...center,
    ...bottom,
    '</g>',
    edge,
    '</svg>',
  ].join('')
}
