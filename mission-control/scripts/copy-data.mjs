// Copy collected dashboard data into dist/ so the built site serves it
// same-origin (dist/data/dashboard.json) with the raw GitHub URL as fallback.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, 'data', 'dashboard.json')
const dst = join(root, 'dist', 'data', 'dashboard.json')

if (!existsSync(src)) {
  console.error(`[copy-data] missing ${src} — run scripts/collect-data.py first`)
  process.exit(1)
}

mkdirSync(dirname(dst), { recursive: true })
copyFileSync(src, dst)
console.log(`[copy-data] data/dashboard.json -> dist/data/dashboard.json`)
