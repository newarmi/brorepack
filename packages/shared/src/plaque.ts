import { getTemplate } from './catalog'
import type { LevelColorRule } from './catalog'
import { getLevelColor } from './faceit'
import type { PlaqueDesign, PlaqueSize } from './types'

// Плашка рисуется одной функцией и для превью в приложении, и для файла в типографию.
// Холст — лист A5 в пунктах, как в макетах дизайнера (FACEIT_A5_*.pdf). Фон, стрелка и знак FACEIT —
// готовый арт шаблона (packages/shared/assets/plaques), поверх него — кольцо уровня, ник и подпись.

export const PLAQUE_VIEWBOX = { width: 419.5276, height: 595.2756 } as const

export const PLAQUE_PRINT_SIZE_MM: Record<PlaqueSize, { width: number; height: number }> = {
  A5: { width: 148, height: 210 },
}

export const PLAQUE_FONT = "Play, 'Arial Narrow', Arial, sans-serif"

/** Арт шаблона: ссылка на файл (превью) или его разметка, встроенная в SVG (печать) */
export type PlaqueArt = { href: string } | { markup: string }

export interface RenderPlaqueOptions {
  /** preview тянется по контейнеру, со скруглением и кантом акрила; print — размеры в мм, без канта */
  mode?: 'preview' | 'print'
  /** Без арта рисуется только цвет фона шаблона */
  art?: PlaqueArt
  /** CSS с @font-face в base64, чтобы файл для печати был самодостаточным */
  embeddedFontCss?: string
  /** Префикс для id внутри SVG, если на странице несколько плашек */
  idPrefix?: string
}

// В макетах содержимое занимает 419.02 × 594.55 pt со сдвигом 0.02 — растягиваем его на весь лист,
// иначе справа и снизу остаётся полоса в полпункта
const ART_TRANSFORM = 'matrix(1.00122 0 0 1.00122 -0.02 0)'

// --- Геометрия из макетов, pt ---
const CENTER_X = 209.53
const RING = {
  cx: 209.29,
  cy: 365.79,
  outerRadius: 44.48,
  innerRadius: 35.03,
  /** Начало дуги — внизу слева; углы SVG, по часовой от оси X */
  startAngle: 124.4,
  /** Длина дуги растёт с уровнем: 7 lvl — 243.8°, 9 lvl — 269.9°, как в макетах */
  sweepBase: 152.3,
  sweepPerLevel: 13.07,
  /** Конец дуги срезан наискось: внутренний край короче внешнего */
  endCutAngle: 4.9,
}
const DIGIT = { size: 42.9, baseline: 380.24 }
const NICKNAME = { size: 15.65, baseline: 430.6, maxWidth: 330 }
const CAPTION = { size: 15.1, baseline: 452.4, maxWidth: 360 }

/** Звезда в знаке FACEIT: у части шаблонов её цвет зависит от уровня, поэтому она не входит в арт */
const FACEIT_STAR_PATH =
  'M238.77 521.1C239.46 521.59 241.91 522.36 242.92 522.76C244.85 523.51 254.61 527.47 255.24 527.42L255.2 514.48C254.86 514.55 254.77 514.8 254.55 515.15L252.98 517.6C252.28 518.66 251.53 520 250.84 520.92C249.14 520.94 239.43 520.67 238.77 521.1Z'

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

/** Цвет кольца или звезды для уровня игрока */
export function resolveLevelColor(rule: LevelColorRule, level: number): string {
  if (rule === 'faceit') return getLevelColor(level)
  if (typeof rule === 'string') return rule
  return level <= 7 ? rule.low : rule.high
}

function polarPoint(radius: number, angle: number): string {
  const radians = (angle * Math.PI) / 180
  return `${round(RING.cx + radius * Math.cos(radians))} ${round(RING.cy + radius * Math.sin(radians))}`
}

/** Контур кольца уровня. Тот же контур рисует шкала уровня в приложении */
export function buildLevelRingPath(level: number): string {
  const clampedLevel = Math.min(10, Math.max(1, Math.round(level)))
  const { outerRadius, innerRadius, startAngle } = RING
  const outerEnd = startAngle + RING.sweepBase + RING.sweepPerLevel * clampedLevel
  const innerEnd = outerEnd - RING.endCutAngle
  const largeArcFlag = (end: number) => (end - startAngle > 180 ? 1 : 0)
  return [
    `M${polarPoint(outerRadius, startAngle)}`,
    `A${outerRadius} ${outerRadius} 0 ${largeArcFlag(outerEnd)} 1 ${polarPoint(outerRadius, outerEnd)}`,
    `L${polarPoint(innerRadius, innerEnd)}`,
    `A${innerRadius} ${innerRadius} 0 ${largeArcFlag(innerEnd)} 0 ${polarPoint(innerRadius, startAngle)}`,
    'Z',
  ].join('')
}

/** Квадрат вокруг кольца — viewBox для шкалы уровня в приложении */
export const LEVEL_RING_VIEWBOX = `${round(RING.cx - 50)} ${round(RING.cy - 50)} 100 100`

/** Где и каким кеглем стоит цифра уровня — для шкалы уровня в приложении */
export const LEVEL_DIGIT = { x: CENTER_X, y: DIGIT.baseline, size: DIGIT.size } as const

/** Внутренности SVG-файла без обёртки <svg> — чтобы встроить арт в файл для печати */
export function getSvgInnerMarkup(svg: string): string {
  const start = svg.indexOf('>', svg.indexOf('<svg')) + 1
  return svg.slice(start, svg.lastIndexOf('</svg>'))
}

function renderArt(art: PlaqueArt | undefined): string {
  if (!art) return ''
  if ('markup' in art) return art.markup
  return `<image href="${escapeXml(art.href)}" width="${PLAQUE_VIEWBOX.width}" height="${PLAQUE_VIEWBOX.height}"/>`
}

/** Уровень 0 — ещё неизвестен (экран ввода ника): кольцо во весь ход полупрозрачное, вместо цифры «?» */
const UNKNOWN_LEVEL = 0

function renderRing(design: PlaqueDesign): string {
  const template = getTemplate(design.templateId)
  if (design.level === UNKNOWN_LEVEL) {
    return `<path d="${buildLevelRingPath(10)}" fill="${template.textColor}" fill-opacity="0.3"/>`
  }
  return `<path d="${buildLevelRingPath(design.level)}" fill="${resolveLevelColor(template.ringColor, design.level)}"/>`
}

/** Всё, что зависит от игрока: кольцо, звезда FACEIT, цифра уровня, ник и подпись */
function renderPlayerLayer(design: PlaqueDesign): string {
  const template = getTemplate(design.templateId)
  const digit = design.level === UNKNOWN_LEVEL ? '?' : String(design.level)
  const nameSize = fitFontSize(design.displayName, NICKNAME.size, NICKNAME.maxWidth, 0.56)
  const captionSize = fitFontSize(design.caption, CAPTION.size, CAPTION.maxWidth, 0.48)
  const textAttrs = `text-anchor="middle" font-family="${PLAQUE_FONT}" fill="${template.textColor}"`
  const layer = [
    renderRing(design),
    `<path d="${FACEIT_STAR_PATH}" fill="${resolveLevelColor(template.starColor, design.level)}"/>`,
    `<text x="${CENTER_X}" y="${DIGIT.baseline}" ${textAttrs} font-weight="700" font-size="${DIGIT.size}">${digit}</text>`,
    `<text x="${CENTER_X}" y="${NICKNAME.baseline}" ${textAttrs} font-weight="700" font-size="${nameSize}">${escapeXml(design.displayName)}</text>`,
  ]
  if (design.caption) {
    layer.push(
      `<text x="${CENTER_X}" y="${CAPTION.baseline}" ${textAttrs} font-weight="400" font-size="${captionSize}">${escapeXml(design.caption)}</text>`,
    )
  }
  return layer.join('')
}

export function renderPlaqueSvg(design: PlaqueDesign, options: RenderPlaqueOptions = {}): string {
  const { mode = 'preview', art, embeddedFontCss, idPrefix = 'plaque' } = options
  const { width: w, height: h } = PLAQUE_VIEWBOX
  const isPrint = mode === 'print'
  const printSize = PLAQUE_PRINT_SIZE_MM[design.size]
  const sizeAttrs = isPrint ? `width="${printSize.width}mm" height="${printSize.height}mm"` : 'width="100%" height="100%"'
  const cornerRadius = isPrint ? 0 : 8
  const clipId = `${idPrefix}-clip`

  const defs = [`<clipPath id="${clipId}"><rect width="${w}" height="${h}" rx="${cornerRadius}"/></clipPath>`]
  if (embeddedFontCss) defs.push(`<style>${embeddedFontCss}</style>`)
  // Кант акрила — только в превью
  const edge = isPrint
    ? ''
    : `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${cornerRadius}" fill="none" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="2"/>`
  const label = escapeXml(`Плашка: ${design.displayName}, ${design.level} уровень`)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" ${sizeAttrs} role="img" aria-label="${label}">`,
    `<defs>${defs.join('')}</defs>`,
    `<g clip-path="url(#${clipId})">`,
    `<rect width="${w}" height="${h}" fill="${getTemplate(design.templateId).baseColor}"/>`,
    `<g transform="${ART_TRANSFORM}">`,
    renderArt(art),
    renderPlayerLayer(design),
    '</g>',
    '</g>',
    edge,
    '</svg>',
  ].join('')
}
