// Скачивает TTF-шрифты плашки в apps/server/fonts/<Family>-<weight>.ttf.
// Google Fonts без браузерного User-Agent отдаёт ссылки на полные TTF (со всеми алфавитами,
// включая кириллицу) — они нужны resvg для PNG и для @font-face в SVG.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CSS_URL = 'https://fonts.googleapis.com/css2?family=Play:wght@400;700'
const fontsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'fonts')

const cssResponse = await fetch(CSS_URL)
if (!cssResponse.ok) throw new Error(`Google Fonts CSS: HTTP ${cssResponse.status}`)
const css = await cssResponse.text()

const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body]) => ({
  family: body.match(/font-family:\s*'([^']+)'/)?.[1],
  weight: body.match(/font-weight:\s*(\d+)/)?.[1],
  url: body.match(/url\((https:[^)]+\.ttf)\)/)?.[1],
}))

if (faces.length === 0 || faces.some((face) => !face.family || !face.weight || !face.url)) {
  throw new Error(`Не удалось разобрать CSS Google Fonts:\n${css}`)
}

await mkdir(fontsDir, { recursive: true })

for (const face of faces) {
  const response = await fetch(face.url)
  if (!response.ok) throw new Error(`${face.url}: HTTP ${response.status}`)
  const file = resolve(fontsDir, `${face.family}-${face.weight}.ttf`)
  await writeFile(file, Buffer.from(await response.arrayBuffer()))
  console.log(`✓ ${face.family} ${face.weight} → ${file}`)
}
