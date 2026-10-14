// Сборка бэкенда для Google Apps Script: один файл dist/Code.js + манифест.
// Apps Script не знает модулей, поэтому всё (включая zod и @brorepack/shared) склеивается в IIFE,
// а точки входа объявляются функциями верхнего уровня — только такие видит Apps Script.
import { copyFileSync, mkdirSync, rmSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const ROOT = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(ROOT, 'dist')
const GLOBAL_NAME = '__brorepack'

/** Функции, которые Apps Script вызывает сам (doGet/doPost) или которые запускают из редактора */
const ENTRY_POINTS = ['doGet', 'doPost', 'setup', 'setWebhook', 'deleteWebhook', 'setMenuButton', 'checkConfig']

const banner = [
  '// BROREPACK API для Google Apps Script.',
  '// Файл собран из apps/gas/src командой `pnpm --filter @brorepack/gas run build` — не редактируй его вручную.',
].join('\n')

const footer = [
  '',
  '// --- Точки входа Apps Script ---',
  ...ENTRY_POINTS.map((name) =>
    name.startsWith('do')
      ? `function ${name}(e) { return ${GLOBAL_NAME}.${name}(e); }`
      : `function ${name}() { return ${GLOBAL_NAME}.${name}(); }`,
  ),
  '',
].join('\n')

/**
 * z.locales тянет ~40 языков (≈220 КБ), а нужен только русский. Apps Script разбирает весь скрипт
 * на каждый запрос, поэтому лишний код — это лишняя задержка: подменяем индекс локалей на ru + en.
 */
const zodLocalesPlugin = {
  name: 'zod-locales-ru-only',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /\/locales\/index\.js$/ }, (args) => {
      if (!/[\\/]zod[\\/]/.test(args.importer)) return undefined
      return { path: resolve(args.resolveDir, args.path), namespace: 'zod-locales' }
    })
    pluginBuild.onLoad({ filter: /.*/, namespace: 'zod-locales' }, (args) => ({
      contents: 'export { default as ru } from "./ru.js";\nexport { default as en } from "./en.js";\n',
      resolveDir: dirname(args.path),
      loader: 'js',
    }))
  },
}

// Старые файлы (например, Code.gs, который кладёт `clasp create`) иначе уедут в проект вместе с Code.js
rmSync(DIST, { recursive: true, force: true })
mkdirSync(DIST, { recursive: true })

await build({
  entryPoints: [resolve(ROOT, 'src/index.ts')],
  outfile: resolve(DIST, 'Code.js'),
  bundle: true,
  format: 'iife',
  globalName: GLOBAL_NAME,
  platform: 'neutral',
  mainFields: ['module', 'main'],
  // Apps Script V8 — без модулей и Node API; синтаксис новее ES2020 понижаем
  target: 'es2020',
  charset: 'utf8',
  legalComments: 'none',
  // Пробелы и синтаксис сжимаем, имена оставляем — иначе стеки ошибок в логах Apps Script не прочитать
  minifyWhitespace: true,
  minifySyntax: true,
  minifyIdentifiers: false,
  keepNames: false,
  banner: { js: banner },
  footer: { js: footer },
  plugins: [zodLocalesPlugin],
  logLevel: 'warning',
})

copyFileSync(resolve(ROOT, 'appsscript.json'), resolve(DIST, 'appsscript.json'))

const sizeKb = Math.round(statSync(resolve(DIST, 'Code.js')).size / 1024)
console.log(`dist/Code.js — ${sizeKb} КБ, dist/appsscript.json`)
