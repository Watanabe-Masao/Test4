/**
 * Test Taxonomy Inventory Generator (Phase 0)
 *
 * 親 taxonomy-v2 plan §Common Inventory Schema の CanonEntry shape に従って
 * テスト軸 (T:*) の Phase 0 Inventory YAML を生成する。
 *
 * 出力先: projects/test-taxonomy-v2/derived/inventory/test-taxonomy-inventory.yaml
 *
 * 使い方:
 *   cd app && npx tsx ../tools/scripts/test-taxonomy-inventory.ts
 *
 * 設計原則:
 * - read-only スクリプト（テストコードを変更しない）
 * - T:kind は v2-only 概念のため、全 test は v1 では "untagged"（= currentTag）
 * - Anchor Slice 6 T:kind 帰属はファイルパス + 軽量内容パターンで機械判定
 * - 既存 TSIG-* rule（global obligation）は test entry と独立に記録
 *
 * 関連:
 * - projects/taxonomy-v2/plan.md §Common Inventory Schema
 * - projects/test-taxonomy-v2/plan.md Phase 0
 * - app/src/test/guards/testSignalIntegrityGuard.test.ts (TSIG global rules)
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

// ---------------------------------------------------------------------------
// パス設定
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(__dirname, '../..')
const APP_SRC = resolve(REPO_ROOT, 'app/src')
// 子 Phase 0 では project-internal な derived/ に出力する（references/02-status/
// の obligation trigger を避け、parallel branch 間のコンフリクトを最小化）。
// 親 Phase 4 統合時に references/02-status/test-taxonomy-inventory.yaml に
// 正本配置される。
const OUTPUT_PATH = resolve(
  REPO_ROOT,
  'projects/test-taxonomy-v2/derived/inventory/test-taxonomy-inventory.yaml',
)

// ---------------------------------------------------------------------------
// scope: 全 test ファイル (*.test.ts / *.test.tsx)
// ---------------------------------------------------------------------------

const isTestFile = (file: string): boolean => {
  if (!file.endsWith('.test.ts') && !file.endsWith('.test.tsx')) return false
  if (file.includes('.d.ts')) return false
  return true
}

const collectFiles = (absDir: string, predicate: (f: string) => boolean): string[] => {
  const out: string[] = []
  const walk = (dir: string): void => {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const e of entries) {
      const abs = join(dir, e)
      let st
      try {
        st = statSync(abs)
      } catch {
        continue
      }
      if (st.isDirectory()) walk(abs)
      else if (predicate(abs)) out.push(abs)
    }
  }
  walk(absDir)
  return out
}

// ---------------------------------------------------------------------------
// Anchor Slice 6 T:kind の判定
//
// 親 plan §OCS.7:
//   T:unit-numerical / T:boundary / T:contract-parity / T:zod-contract /
//   T:meta-guard / T:render-shape
//
// 判定優先度 (1 ファイル = 1 anchor、複数 anchor は最も顕著なものを選ぶ):
//   1. T:meta-guard      — test/guards/*.test.ts (guard 自身を守る test)
//   2. T:zod-contract    — application/readModels/**/__tests__/ または ファイル内 .parse() / Zod schema 言及
//   3. T:contract-parity — *.parity.test.ts / *Bridge*.test.ts / contract タイプ
//   4. T:unit-numerical  — domain/calculations/**/__tests__/ (数値契約・invariant)
//   5. T:render-shape    — presentation/**/*.test.tsx (描画形状)
//   6. T:boundary        — *boundary* / *edge* / *empty* 等の境界条件 test
// ---------------------------------------------------------------------------

type AnchorTag =
  | 'T:unit-numerical'
  | 'T:boundary'
  | 'T:contract-parity'
  | 'T:zod-contract'
  | 'T:meta-guard'
  | 'T:render-shape'

const detectAnchorTag = (relPath: string, content: string): AnchorTag | null => {
  // 1. T:meta-guard
  if (relPath.startsWith('test/guards/') && relPath.endsWith('.test.ts')) {
    return 'T:meta-guard'
  }

  // 2. T:zod-contract
  if (relPath.startsWith('application/readModels/') && relPath.includes('__tests__/')) {
    return 'T:zod-contract'
  }
  if (/\.zod\.test\./.test(relPath) || /\.parse\(|z\.object\(|safeParse\(/.test(content)) {
    return 'T:zod-contract'
  }

  // 3. T:contract-parity
  if (/\.parity\.test\./.test(relPath)) return 'T:contract-parity'
  if (/Bridge.*\.test\./.test(relPath)) return 'T:contract-parity'

  // 4. T:unit-numerical
  if (relPath.startsWith('domain/calculations/') && relPath.includes('__tests__/')) {
    return 'T:unit-numerical'
  }

  // 5. T:render-shape
  if (relPath.startsWith('presentation/') && relPath.endsWith('.test.tsx')) {
    return 'T:render-shape'
  }

  // 6. T:boundary (heuristic: filename suggests boundary / edge / empty / null)
  const fileName = relPath.split('/').pop() ?? ''
  if (/(boundary|edge|empty|null|missing|invalid)/i.test(fileName)) {
    return 'T:boundary'
  }

  return null
}

// ---------------------------------------------------------------------------
// CanonEntry 構造（親 plan §Common Inventory Schema 準拠）
//
// テスト軸の特殊事情:
// - T:kind は v2-only 概念のため、全 test は v1 では currentTag = "untagged"
// - TSIG-* global rule は currentTSIG field で記録（v1 obligation 痕跡）
// ---------------------------------------------------------------------------

type EvidenceLevel = 'generated' | 'tested' | 'guarded' | 'reviewed' | 'asserted' | 'unknown'
type Lifecycle = 'proposed' | 'active' | 'deprecated' | 'sunsetting' | 'retired' | 'archived'
type PromotionLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'

interface CanonEntry {
  readonly axis: 'test'
  readonly target: string
  readonly currentTag: string // 全 test は "untagged" (T:kind は v2-only)
  readonly currentTSIG: readonly string[] // 適用される TSIG global rule
  readonly promotionLevel: PromotionLevel
  readonly lifecycle: Lifecycle
  readonly evidenceLevel: EvidenceLevel
  readonly origin: {
    readonly why: string
    readonly when: string
    readonly who: string
    readonly sunsetCondition: string | null
  }
  readonly anchorSlice: {
    readonly inAnchor: boolean
    readonly anchorTag: AnchorTag | null
  }
  readonly interlock: {
    readonly requiredObligations: readonly string[]
    readonly foundObligations: readonly string[]
  }
  readonly driftBudget: {
    readonly untagged: 0 | 1
    readonly unknownVocabulary: 0 | 1
    readonly missingOrigin: 0 | 1
  }
}

// 各 T:kind Anchor → 対応 R:tag (interlock マトリクス §2.2 から導出)
const ANCHOR_INTERLOCK: Readonly<Record<AnchorTag, readonly string[]>> = {
  'T:unit-numerical': ['R:calculation'],
  'T:boundary': ['R:calculation'],
  'T:contract-parity': ['R:bridge'],
  'T:zod-contract': ['R:read-model'],
  'T:meta-guard': ['R:guard'],
  'T:render-shape': ['R:presentation'],
}

// ---------------------------------------------------------------------------
// TSIG global rule の適用判定
//
// 全 test に global で適用される rule:
// - TSIG-TEST-01: existence-only assertion
// - TSIG-TEST-04: tautology assertion
// - AR-G3-SUPPRESS-RATIONALE: structured rationale (suppress 利用 test 限定)
// - TSIG-COMP-03: unused suppress escape (suppress 利用 test 限定)
// ---------------------------------------------------------------------------

const detectTsigRules = (content: string): string[] => {
  const rules: string[] = ['TSIG-TEST-01', 'TSIG-TEST-04'] // global rules: 全 test 対象
  if (
    /@ts-(ignore|expect-error)|eslint-disable/.test(content) ||
    /\b__\w/.test(content) // multi-underscore suppress escape
  ) {
    rules.push('AR-G3-SUPPRESS-RATIONALE', 'TSIG-COMP-03')
  }
  return rules
}

// ---------------------------------------------------------------------------
// 1 file → 1 CanonEntry
// ---------------------------------------------------------------------------

const buildEntry = (absPath: string): CanonEntry => {
  const target = relative(REPO_ROOT, absPath).replace(/\\/g, '/')
  const relInSrc = relative(APP_SRC, absPath).replace(/\\/g, '/')

  let content: string
  try {
    content = readFileSync(absPath, 'utf-8')
  } catch {
    content = ''
  }

  const anchorTag = detectAnchorTag(relInSrc, content)
  const currentTSIG = detectTsigRules(content)

  // currentTag — 全 test は "untagged" (T:kind は v2 でしか付与されない)
  const currentTag = 'untagged'

  // promotionLevel — TSIG global rule が適用されているなら最低 L1 相当（registered as legacy）
  // しかし T:kind 個別は未定義 → L0 (proposed)
  const promotionLevel: PromotionLevel = 'L0'

  // lifecycle — proposed (T:kind 未付与のため)
  const lifecycle: Lifecycle = 'proposed'

  // evidenceLevel — TSIG global rule が global 強制している → guarded だが軸が global
  const evidenceLevel: EvidenceLevel = 'guarded'

  // Origin — TSIG ベースの legacy 状態
  const origin = {
    why: `existing test under TSIG global rules (${currentTSIG.join(', ')}) — adopted before taxonomy-v2`,
    when: 'legacy, origin unknown',
    who: 'legacy, origin unknown',
    sunsetCondition:
      'v2 T:kind 付与（子 Phase 6 Migration Rollout）+ TSIG global rule 撤退（子 Phase 7-8）',
  }

  // Anchor Slice
  const inAnchor = anchorTag !== null
  const anchorSlice = { inAnchor, anchorTag }

  // Interlock — Anchor 6 T:kind の対応 R:tag
  const interlock = {
    requiredObligations: anchorTag !== null ? ANCHOR_INTERLOCK[anchorTag] : [],
    foundObligations: [] as readonly string[], // Phase 0 では実態 0、子 Phase 3 で計測
  }

  // Drift Budget
  const driftBudget = {
    untagged: 1 as 0 | 1, // 全 test untagged
    unknownVocabulary: 0 as 0 | 1, // T:kind vocabulary 自体が未定義のため "unknown" 判定不可
    missingOrigin: 1 as 0 | 1, // TSIG ベースの legacy のため Origin unknown
  }

  return {
    axis: 'test',
    target,
    currentTag,
    currentTSIG,
    promotionLevel,
    lifecycle,
    evidenceLevel,
    origin,
    anchorSlice,
    interlock,
    driftBudget,
  }
}

// ---------------------------------------------------------------------------
// YAML serializer（minimal、軽量）
// ---------------------------------------------------------------------------

const yamlEscape = (s: string): string => {
  if (/^[A-Za-z0-9_+\-./:= ]*$/.test(s) && !s.startsWith(' ') && !s.endsWith(' ')) {
    if (s === 'true' || s === 'false' || s === 'null' || /^\d/.test(s)) return `'${s}'`
    return s
  }
  return `'${s.replace(/'/g, "''")}'`
}

const serializeEntry = (e: CanonEntry): string => {
  const lines: string[] = []
  lines.push(`- axis: ${e.axis}`)
  lines.push(`  target: ${yamlEscape(e.target)}`)
  lines.push(`  currentTag: ${yamlEscape(e.currentTag)}`)
  lines.push(`  currentTSIG: [${e.currentTSIG.map((s) => yamlEscape(s)).join(', ')}]`)
  lines.push(`  promotionLevel: ${e.promotionLevel}`)
  lines.push(`  lifecycle: ${e.lifecycle}`)
  lines.push(`  evidenceLevel: ${e.evidenceLevel}`)
  lines.push(`  origin:`)
  lines.push(`    why: ${yamlEscape(e.origin.why)}`)
  lines.push(`    when: ${yamlEscape(e.origin.when)}`)
  lines.push(`    who: ${yamlEscape(e.origin.who)}`)
  lines.push(
    `    sunsetCondition: ${e.origin.sunsetCondition === null ? 'null' : yamlEscape(e.origin.sunsetCondition)}`,
  )
  lines.push(`  anchorSlice:`)
  lines.push(`    inAnchor: ${e.anchorSlice.inAnchor}`)
  lines.push(
    `    anchorTag: ${e.anchorSlice.anchorTag === null ? 'null' : e.anchorSlice.anchorTag}`,
  )
  lines.push(`  interlock:`)
  lines.push(
    `    requiredObligations: [${e.interlock.requiredObligations.map((s) => yamlEscape(s)).join(', ')}]`,
  )
  lines.push(
    `    foundObligations: [${e.interlock.foundObligations.map((s) => yamlEscape(s)).join(', ')}]`,
  )
  lines.push(`  driftBudget:`)
  lines.push(`    untagged: ${e.driftBudget.untagged}`)
  lines.push(`    unknownVocabulary: ${e.driftBudget.unknownVocabulary}`)
  lines.push(`    missingOrigin: ${e.driftBudget.missingOrigin}`)
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const main = (): void => {
  const allFiles = collectFiles(APP_SRC, isTestFile).sort()
  const entries = allFiles.map(buildEntry)

  // 集計
  const total = entries.length
  const byAnchor: Record<string, number> = {}
  const byTsig: Record<string, number> = {}
  let inAnchorCount = 0
  let untagged = 0
  let unknownVocabulary = 0
  let missingOrigin = 0

  for (const e of entries) {
    if (e.anchorSlice.inAnchor) {
      inAnchorCount++
      if (e.anchorSlice.anchorTag) {
        byAnchor[e.anchorSlice.anchorTag] = (byAnchor[e.anchorSlice.anchorTag] ?? 0) + 1
      }
    }
    for (const r of e.currentTSIG) {
      byTsig[r] = (byTsig[r] ?? 0) + 1
    }
    untagged += e.driftBudget.untagged
    unknownVocabulary += e.driftBudget.unknownVocabulary
    missingOrigin += e.driftBudget.missingOrigin
  }

  // YAML 出力
  const header: string[] = []
  header.push('# Test Taxonomy Inventory (Phase 0)')
  header.push('# 親 taxonomy-v2 plan.md §Common Inventory Schema (CanonEntry shape) 準拠')
  header.push(`# Generated: ${new Date().toISOString()}`)
  header.push('# Generator: tools/scripts/test-taxonomy-inventory.ts')
  header.push('# 再生成: cd app && npx tsx ../tools/scripts/test-taxonomy-inventory.ts')
  header.push('#')
  header.push('# === 集計結果 ===')
  header.push(`# total entries: ${total}`)
  header.push(`# in Anchor Slice: ${inAnchorCount}`)
  for (const a of Object.keys(byAnchor).sort()) {
    header.push(`#   ${a}: ${byAnchor[a]}`)
  }
  header.push('# Drift Budget baseline:')
  header.push(`#   untagged: ${untagged}`)
  header.push(`#   unknownVocabulary: ${unknownVocabulary}`)
  header.push(`#   missingOrigin: ${missingOrigin}`)
  header.push('# TSIG global rule applications:')
  for (const r of Object.keys(byTsig).sort()) {
    header.push(`#   ${r}: ${byTsig[r]}`)
  }
  header.push('')

  const summaryYaml = [
    'summary:',
    `  schemaVersion: '1.0'`,
    `  schemaSource: ${yamlEscape('projects/taxonomy-v2/plan.md §Common Inventory Schema')}`,
    `  generatedAt: ${yamlEscape(new Date().toISOString())}`,
    `  generator: ${yamlEscape('tools/scripts/test-taxonomy-inventory.ts')}`,
    `  axis: test`,
    `  aggregate:`,
    `    totalEntries: ${total}`,
    `    inAnchorSlice: ${inAnchorCount}`,
    `    byAnchorTag:`,
    ...Object.entries(byAnchor)
      .sort()
      .map(([k, v]) => `      ${yamlEscape(k)}: ${v}`),
    `    driftBudget:`,
    `      untagged: ${untagged}`,
    `      unknownVocabulary: ${unknownVocabulary}`,
    `      missingOrigin: ${missingOrigin}`,
    `    tsigDistribution:`,
    ...Object.entries(byTsig)
      .sort()
      .map(([k, v]) => `      ${yamlEscape(k)}: ${v}`),
    '',
  ].join('\n')

  const body = entries.map(serializeEntry).join('\n')
  const out = `${header.join('\n')}\n${summaryYaml}\nentries:\n${body}\n`

  writeFileSync(OUTPUT_PATH, out, 'utf-8')

  // stdout summary
  console.log(`✓ Generated ${OUTPUT_PATH}`)
  console.log(`  total entries: ${total}`)
  console.log(`  in Anchor Slice: ${inAnchorCount}`)
  for (const a of Object.keys(byAnchor).sort()) {
    console.log(`    ${a}: ${byAnchor[a]}`)
  }
  console.log(`  Drift Budget baseline:`)
  console.log(`    untagged: ${untagged}`)
  console.log(`    unknownVocabulary: ${unknownVocabulary}`)
  console.log(`    missingOrigin: ${missingOrigin}`)
}

main()
