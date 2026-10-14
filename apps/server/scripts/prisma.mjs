// Обёртка над Prisma CLI: подхватывает .env (если есть) и подставляет DATABASE_URL по умолчанию,
// чтобы `pnpm db:push` работал из коробки так же, как сервер (file:./dev.db → prisma/dev.db).
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envFile = resolve(serverRoot, '.env')

if (existsSync(envFile)) process.loadEnvFile(envFile)
process.env.DATABASE_URL ||= 'file:./dev.db'

const args = process.argv.slice(2)
const require = createRequire(import.meta.url)
let prismaCli
try {
  prismaCli = resolve(dirname(require.resolve('prisma/package.json')), 'build/index.js')
} catch {
  // `pnpm install --prod` ставит пакеты без prisma CLI — postinstall не должен из-за этого падать
  console.warn('[prisma] CLI не установлен (devDependency), пропускаю:', args.join(' '))
  process.exit(args[0] === 'generate' ? 0 : 1)
}

const result = spawnSync(process.execPath, [prismaCli, ...args], { cwd: serverRoot, stdio: 'inherit' })
process.exit(result.status ?? 1)
