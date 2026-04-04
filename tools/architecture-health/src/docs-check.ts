/**
 * docs:check — 生成 → 差分検出 → 不一致で fail
 *
 * 「更新しないと通らない」を実現するスクリプト。
 * CI で実行し、generated section が最新でなければ exit 1。
 */
import { execSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../../..')

// ---------------------------------------------------------------------------
// 1. docs:generate を実行
// ---------------------------------------------------------------------------
console.log('[docs:check] Running docs:generate...')
try {
  execSync('npx tsx tools/architecture-health/src/main.ts', {
    cwd: repoRoot,
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: 60000,
  })
} catch (err) {
  // health hard gate fail は後で拾う
  const exitCode = (err as { status?: number }).status
  if (exitCode === 1) {
    console.error('[docs:check] Health hard gate failed')
    process.exit(1)
  }
  throw err
}

// ---------------------------------------------------------------------------
// 2. git diff で差分検出
// ---------------------------------------------------------------------------
console.log('[docs:check] Checking for uncommitted generated changes...')

const GENERATED_PATHS = [
  'references/02-status/generated/architecture-health.json',
  'references/02-status/generated/architecture-health.md',
  'references/02-status/generated/architecture-health-certificate.md',
  'CLAUDE.md',
  'references/02-status/technical-debt-roadmap.md',
]

let hasDiff = false
for (const path of GENERATED_PATHS) {
  try {
    execSync(`git diff --exit-code -- "${path}"`, {
      cwd: repoRoot,
      stdio: 'pipe',
    })
  } catch {
    console.error(`[docs:check] ✗ ${path} has uncommitted generated changes`)
    hasDiff = true
  }
}

if (hasDiff) {
  console.error('')
  console.error('[docs:check] FAIL — generated docs are stale.')
  console.error('Run `npm run docs:generate` and commit the changes.')
  process.exit(1)
}

console.log('[docs:check] PASS — all generated docs are up to date.')
