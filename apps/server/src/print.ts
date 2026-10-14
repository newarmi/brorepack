import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { crc32 } from 'node:zlib'
import { PLAQUE_PRINT_SIZE_MM, renderPlaqueSvg, type PlaqueDesign } from '@brorepack/shared'
import { renderAsync } from '@resvg/resvg-js'
import type { FastifyBaseLogger } from 'fastify'

export const PRINT_DPI = 300

/** Начертания плашки: имена семейств совпадают с PLAQUE_FONT_DISPLAY / PLAQUE_FONT_TEXT из shared */
const FONT_FACES = [
  { family: 'Unbounded', weight: 700, file: 'Unbounded-700.ttf' },
  { family: 'Unbounded', weight: 900, file: 'Unbounded-900.ttf' },
  { family: 'Onest', weight: 400, file: 'Onest-400.ttf' },
  { family: 'Onest', weight: 600, file: 'Onest-600.ttf' },
] as const

interface LoadedFonts {
  /** @font-face с base64 для самодостаточного SVG */
  css: string
  /** Пути к TTF для resvg */
  files: string[]
}

export function mmToPx(mm: number, dpi = PRINT_DPI): number {
  return Math.round((mm / 25.4) * dpi)
}

export interface RenderedPng {
  buffer: Buffer
  width: number
  height: number
}

export interface PrintRenderer {
  renderSvg(design: PlaqueDesign): Promise<string>
  renderPng(design: PlaqueDesign): Promise<RenderedPng>
}

export function createPrintRenderer({ fontsDir, logger }: { fontsDir: string; logger: FastifyBaseLogger }): PrintRenderer {
  let fontsPromise: Promise<LoadedFonts> | null = null

  async function readFonts(): Promise<LoadedFonts> {
    const rules: string[] = []
    const files: string[] = []
    const missing: string[] = []

    for (const face of FONT_FACES) {
      const path = resolve(fontsDir, face.file)
      if (!existsSync(path)) {
        missing.push(face.file)
        continue
      }
      const base64 = (await readFile(path)).toString('base64')
      files.push(path)
      rules.push(
        `@font-face{font-family:'${face.family}';font-style:normal;font-weight:${face.weight};` +
          `src:url(data:font/ttf;base64,${base64}) format('truetype');}`,
      )
    }

    if (missing.length > 0) {
      logger.warn(
        { fontsDir, missing },
        'Шрифты для печати не найдены — файлы отрендерятся запасными шрифтами. Запусти `pnpm --filter @brorepack/server fonts`',
      )
    }
    return { css: rules.join(''), files }
  }

  function loadFonts(): Promise<LoadedFonts> {
    fontsPromise ??= readFonts().catch((error: unknown) => {
      fontsPromise = null
      throw error
    })
    return fontsPromise
  }

  return {
    async renderSvg(design) {
      const { css } = await loadFonts()
      return renderPlaqueSvg(design, { mode: 'print', embeddedFontCss: css || undefined })
    },

    async renderPng(design) {
      const { files } = await loadFonts()
      // resvg не читает @font-face, ему шрифты передаются файлами — поэтому рендерим SVG без base64
      const svg = renderPlaqueSvg(design, { mode: 'print' })
      const image = await renderAsync(svg, {
        fitTo: { mode: 'width', value: mmToPx(PLAQUE_PRINT_SIZE_MM[design.size].width) },
        font: {
          fontFiles: files,
          loadSystemFonts: files.length === 0,
          defaultFontFamily: 'Onest',
        },
        logLevel: 'off',
      })
      return { buffer: setPngDpi(image.asPng(), PRINT_DPI), width: image.width, height: image.height }
    },
  }
}

const PNG_SIGNATURE_LENGTH = 8
const IHDR_CHUNK_LENGTH = 4 + 4 + 13 + 4

/** Прописывает в PNG чанк pHYs, чтобы редакторы и типография видели 300 dpi, а не 72 */
export function setPngDpi(png: Buffer, dpi: number): Buffer {
  const insertAt = PNG_SIGNATURE_LENGTH + IHDR_CHUNK_LENGTH
  if (png.subarray(12, 16).toString('latin1') !== 'IHDR') return png

  const chunks: Buffer[] = []
  let offset = insertAt
  // Убираем уже существующий pHYs, если есть
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString('latin1')
    const end = offset + 12 + length
    if (type !== 'pHYs') chunks.push(png.subarray(offset, end))
    offset = end
  }

  const pixelsPerMeter = Math.round(dpi / 0.0254)
  const typeAndData = Buffer.alloc(4 + 9)
  typeAndData.write('pHYs', 0, 'latin1')
  typeAndData.writeUInt32BE(pixelsPerMeter, 4)
  typeAndData.writeUInt32BE(pixelsPerMeter, 8)
  typeAndData.writeUInt8(1, 12)
  const physChunk = Buffer.alloc(4 + typeAndData.length + 4)
  physChunk.writeUInt32BE(9, 0)
  typeAndData.copy(physChunk, 4)
  physChunk.writeUInt32BE(crc32(typeAndData), 4 + typeAndData.length)

  return Buffer.concat([png.subarray(0, insertAt), physChunk, ...chunks])
}

export function printFileName(orderNumber: string, extension: 'svg' | 'png'): string {
  return `brorepack-${orderNumber}.${extension}`
}
