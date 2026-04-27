/**
 * Phase 7.5 v1-only File Migration Script (taxonomy-v2)
 *
 * 役割: v1-only tagged file（v1 vocabulary のみ、v2 タグなし）の v1 タグを
 * R:unclassified に置換する一回限りの migration script。
 *
 * 設計判断（review-journal 2026-Q2-1 ad-hoc review 採択）:
 * - v1 → v2 への semantic mapping は **per-file review window で行う**（migration map §1）。
 * - 本 mass migration は **R:unclassified 一律退避**（Constitution 原則 1: 未分類は能動タグ）。
 * - semantic 情報は git history に保持（@responsibility R:foo の編集前 commit）+ 後続 review window で具体タグへ promotion。
 *
 * 使い方:
 *   cd app && npx tsx ../tools/scripts/phase7.5-v1-migration.ts --dry-run
 *   cd app && npx tsx ../tools/scripts/phase7.5-v1-migration.ts
 *
 * 関連:
 * - references/02-status/taxonomy-review-journal.md §3.1（cooling 撤廃の human approval）
 * - app/src/test/guards/taxonomyV1V2GapGuard.test.ts（GAP-R-1 baseline=259 → 0 目標）
 * - references/03-guides/responsibility-v1-to-v2-migration-map.md §1
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../..')
const APP_SRC = resolve(REPO_ROOT, 'app/src')

// v1 TARGET_DIRS (responsibilityTagGuard.test.ts と同期)
const V1_TARGET_DIRS = [
  'application/hooks',
  'presentation/components',
  'presentation/pages',
  'presentation/hooks',
  'features',
]

// v1 vocabulary のみ（v2 と重複する R:calculation / R:adapter は除く）
const V1_ONLY_VOCABULARY = new Set<string>([
  'R:query-plan', 'R:query-exec', 'R:data-fetch', 'R:state-machine', 'R:transform',
  'R:orchestration', 'R:chart-view', 'R:chart-option', 'R:page', 'R:widget', 'R:form',
  'R:navigation', 'R:persistence', 'R:context', 'R:layout', 'R:utility', 'R:reducer', 'R:barrel',
])

const V2_VOCABULARY = new Set<string>([
  'R:calculation', 'R:bridge', 'R:read-model', 'R:guard', 'R:presentation',
  'R:store', 'R:hook', 'R:adapter', 'R:registry', 'R:unclassified',
])

function* walkFiles(dir: string): Generator<string> {
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return }
  for (const e of entries) {
    const p = join(dir, e)
    let st
    try { st = statSync(p) } catch { continue }
    if (st.isDirectory()) yield* walkFiles(p)
    else yield p
  }
}

function isTargetFile(file: string): boolean {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return false
  if (file.includes('.test.')) return false
  if (file.includes('.stories.')) return false
  if (file.includes('.styles.')) return false
  if (file.includes('__tests__')) return false
  if (file.endsWith('/index.ts') || file.endsWith('/index.tsx')) return false
  return true
}

const RESPONSIBILITY_REGEX = /(@responsibility\s+)([^\n\r*]+)/

interface MigrationDecision {
  readonly path: string
  readonly oldLine: string
  readonly newLine: string
  readonly oldTags: readonly string[]
  readonly newTags: readonly string[]
}

function migrateFile(filePath: string): MigrationDecision | null {
  const content = readFileSync(filePath, 'utf-8')
  const match = content.match(RESPONSIBILITY_REGEX)
  if (!match) return null

  const tagsRaw = match[2]!.trim()
  const oldTags = tagsRaw.split(',').map((s) => s.trim()).filter(Boolean)
  const hasV1Only = oldTags.some((t) => V1_ONLY_VOCABULARY.has(t))
  const hasV2 = oldTags.some((t) => V2_VOCABULARY.has(t))

  // v1-only file のみ処理対象
  if (!hasV1Only || hasV2) return null

  // v1 タグを R:unclassified に置換（共通名 R:calculation / R:adapter は v2 として保持）
  const newTags = oldTags.map((t) => {
    if (V1_ONLY_VOCABULARY.has(t)) return 'R:unclassified'
    return t
  })

  // 重複除去
  const dedupedTags = [...new Set(newTags)]

  const oldLine = match[0]!
  const newLine = `${match[1]}${dedupedTags.join(', ')}`

  return {
    path: filePath,
    oldLine,
    newLine,
    oldTags,
    newTags: dedupedTags,
  }
}

function main(): void {
  const dryRun = process.argv.includes('--dry-run')
  const decisions: MigrationDecision[] = []

  for (const dir of V1_TARGET_DIRS) {
    for (const f of walkFiles(resolve(APP_SRC, dir))) {
      if (!isTargetFile(f)) continue
      const d = migrateFile(f)
      if (d) decisions.push(d)
    }
  }

  process.stdout.write(`[phase7.5-migration] dryRun=${dryRun}\n`)
  process.stdout.write(`  v1-only files to migrate: ${decisions.length}\n`)

  // tag distribution
  const tagCounts: Record<string, number> = {}
  for (const d of decisions) {
    for (const t of d.oldTags) {
      if (V1_ONLY_VOCABULARY.has(t)) tagCounts[t] = (tagCounts[t] ?? 0) + 1
    }
  }
  process.stdout.write(`  v1 tag distribution:\n`)
  for (const [tag, count] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`    ${tag}: ${count}\n`)
  }

  if (!dryRun) {
    for (const d of decisions) {
      const content = readFileSync(d.path, 'utf-8')
      const updated = content.replace(d.oldLine, d.newLine)
      writeFileSync(d.path, updated, 'utf-8')
    }
    process.stdout.write(`\n[phase7.5-migration] Applied ${decisions.length} file(s).\n`)
  }
}

main()
