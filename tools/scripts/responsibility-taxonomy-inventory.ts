/**
 * Responsibility Taxonomy Inventory Generator (Phase 0)
 *
 * 親 taxonomy-v2 plan §Common Inventory Schema の CanonEntry shape に従って
 * 責務軸 (R:*) の Phase 0 Inventory YAML を生成する。
 *
 * 出力先: references/02-status/responsibility-taxonomy-inventory.yaml
 *
 * 使い方:
 *   cd app && npx tsx ../tools/scripts/responsibility-taxonomy-inventory.ts
 *
 * 設計原則:
 * - read-only スクリプト（実コードを変更しない）
 * - 既存 v1 タグを壊さない（v1 タグは currentTag にそのまま記録）
 * - Anchor Slice 帰属はディレクトリ pattern で機械判定
 * - Origin は不明なら "legacy, origin unknown" を記録（原則 5: Origin は記録する）
 *
 * 関連:
 * - projects/taxonomy-v2/plan.md §Common Inventory Schema
 * - projects/responsibility-taxonomy-v2/plan.md Phase 0
 * - app/src/test/responsibilityTagRegistry.ts (v1 vocabulary)
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

// ---------------------------------------------------------------------------
// パス設定
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(__dirname, '../..')
const APP_SRC = resolve(REPO_ROOT, 'app/src')
// 出力先 = 親 plan §Common Inventory Schema が指定する正本位置。
// 子 Phase 0 期間は parallel branch コンフリクト回避のため
// projects/responsibility-taxonomy-v2/derived/inventory/ に scratchpad 出力していたが、
// 親 Phase 0 統合 branch (claude/taxonomy-v2-phase0-integration) で本パスに正本配置済。
const OUTPUT_PATH = resolve(
  REPO_ROOT,
  'references/02-status/responsibility-taxonomy-inventory.yaml',
)

// ---------------------------------------------------------------------------
// v1 vocabulary（responsibilityTagRegistry.ts と同期）
// ---------------------------------------------------------------------------

const V1_VOCABULARY: ReadonlySet<string> = new Set([
  'R:query-plan',
  'R:query-exec',
  'R:calculation',
  'R:data-fetch',
  'R:state-machine',
  'R:transform',
  'R:orchestration',
  'R:chart-view',
  'R:chart-option',
  'R:page',
  'R:widget',
  'R:form',
  'R:navigation',
  'R:persistence',
  'R:context',
  'R:layout',
  'R:adapter',
  'R:utility',
  'R:reducer',
  'R:barrel',
])

// ---------------------------------------------------------------------------
// scope: スキャン対象ディレクトリ
//
// v1 guard の TARGET_DIRS（5 件）を超えて、Anchor Slice 5 R:tag が分布する
// 全ディレクトリをカバーする。
// ---------------------------------------------------------------------------

const SCOPE_DIRS: readonly string[] = [
  'application',
  'domain',
  'features',
  'infrastructure',
  'presentation',
  'test',
]

const isProductionFile = (file: string): boolean => {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return false
  if (file.includes('.test.')) return false
  if (file.includes('.stories.')) return false
  if (file.includes('.styles.')) return false
  if (file.includes('__tests__')) return false
  if (file.includes('.d.ts')) return false
  return true
}

const isGuardFile = (file: string): boolean => {
  return file.includes('/test/guards/') && file.endsWith('.test.ts')
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
// v1 tag reader
// ---------------------------------------------------------------------------

const RESPONSIBILITY_REGEX = /@responsibility\s+(.+)/

interface FileTagInfo {
  readonly tags: readonly string[] | null
  readonly raw: string | null
}

const readTags = (absPath: string): FileTagInfo => {
  let content: string
  try {
    content = readFileSync(absPath, 'utf-8')
  } catch {
    return { tags: null, raw: null }
  }
  const match = content.match(RESPONSIBILITY_REGEX)
  if (!match) return { tags: null, raw: null }
  const raw = match[1].trim()
  const tags = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  return { tags, raw }
}

// ---------------------------------------------------------------------------
// Anchor Slice 5 R:tag の判定（path pattern 基準）
//
// 親 plan §OCS.7:
//   R:calculation  / R:bridge  / R:read-model  / R:guard  / R:presentation
// ---------------------------------------------------------------------------

type AnchorTag = 'R:calculation' | 'R:bridge' | 'R:read-model' | 'R:guard' | 'R:presentation'

const detectAnchorTag = (relPath: string): AnchorTag | null => {
  // R:guard — test/guards/*.test.ts
  if (relPath.startsWith('test/guards/') && relPath.endsWith('.test.ts')) return 'R:guard'
  // R:read-model — application/readModels/
  if (relPath.startsWith('application/readModels/')) return 'R:read-model'
  // R:calculation — domain/calculations/
  if (relPath.startsWith('domain/calculations/')) return 'R:calculation'
  // R:bridge — bridge.ts / *Bridge.ts (current ⇔ candidate 境界の archetype)
  const fileName = relPath.split('/').pop() ?? ''
  if (/Bridge\.tsx?$/.test(fileName) || /^bridge\.tsx?$/.test(fileName)) return 'R:bridge'
  // R:presentation — presentation/components/charts/* (描画形状のみが archetype)
  if (
    relPath.startsWith('presentation/components/charts/') &&
    !relPath.endsWith('Logic.ts') &&
    !relPath.endsWith('OptionBuilder.ts') &&
    !relPath.endsWith('.vm.ts')
  ) {
    return 'R:presentation'
  }
  return null
}

// ---------------------------------------------------------------------------
// CanonEntry 構造（親 plan §Common Inventory Schema 準拠）
// ---------------------------------------------------------------------------

type EvidenceLevel = 'generated' | 'tested' | 'guarded' | 'reviewed' | 'asserted' | 'unknown'
type Lifecycle = 'proposed' | 'active' | 'deprecated' | 'sunsetting' | 'retired' | 'archived'
type PromotionLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'

interface CanonEntry {
  readonly axis: 'responsibility'
  readonly target: string
  readonly currentTag: string // v1 tag / "untagged" / "mismatch" / "unknown:<vocab>"
  readonly currentTagsRaw: string | null
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

const ANCHOR_INTERLOCK: Readonly<Record<AnchorTag, readonly string[]>> = {
  'R:calculation': ['T:unit-numerical', 'T:boundary'],
  'R:bridge': ['T:contract-parity'],
  'R:read-model': ['T:zod-contract'],
  'R:guard': ['T:meta-guard'],
  'R:presentation': ['T:render-shape'],
}

// ---------------------------------------------------------------------------
// 1 file → 1 CanonEntry
// ---------------------------------------------------------------------------

const buildEntry = (absPath: string): CanonEntry => {
  const target = relative(REPO_ROOT, absPath).replace(/\\/g, '/')
  const relInSrc = relative(APP_SRC, absPath).replace(/\\/g, '/')
  const info = readTags(absPath)
  const anchorTag = detectAnchorTag(relInSrc)

  // currentTag 判定
  let currentTag: string
  if (info.tags === null) {
    currentTag = 'untagged'
  } else {
    const unknown = info.tags.filter((t) => t.startsWith('R:') && !V1_VOCABULARY.has(t))
    if (unknown.length > 0) {
      currentTag = `unknown:${unknown.join(',')}`
    } else if (info.tags.length > 1) {
      currentTag = info.tags.join('+')
    } else {
      currentTag = info.tags[0]
    }
  }

  // promotionLevel — v1 baseline
  // - 既存 v1 タグ持ち → L1 (Registered)
  // - untagged → L0 (proposed) (Phase 0 では能動付与待ちの状態)
  // - unknown vocabulary → L0
  const promotionLevel: PromotionLevel =
    info.tags !== null && info.tags.every((t) => V1_VOCABULARY.has(t)) ? 'L1' : 'L0'

  // lifecycle — v1 active or proposed
  const lifecycle: Lifecycle = promotionLevel === 'L1' ? 'active' : 'proposed'

  // evidenceLevel — v1 タグは responsibilityTagGuard で guarded
  const evidenceLevel: EvidenceLevel = promotionLevel === 'L1' ? 'guarded' : 'unknown'

  // Origin — v1 採択日不明、legacy 標準値
  const origin = {
    why:
      promotionLevel === 'L1'
        ? `v1 vocabulary (${info.tags?.[0] ?? '?'}) — adopted before taxonomy-v2 Constitution`
        : 'untagged — Phase 2 Migration Path で R:unclassified に明示変換予定',
    when: 'legacy, origin unknown',
    who: 'legacy, origin unknown',
    sunsetCondition:
      promotionLevel === 'L1'
        ? 'v2 vocabulary 確定 (子 Phase 1) 後、対応 v2 R:tag に置換 (子 Phase 6)'
        : 'Phase 2 Migration Path で R:unclassified を能動付与',
  }

  // Anchor Slice
  const inAnchor = anchorTag !== null
  const anchorSlice = { inAnchor, anchorTag }

  // Interlock — Anchor 5 R:tag の required T:kind
  const interlock = {
    requiredObligations: anchorTag !== null ? ANCHOR_INTERLOCK[anchorTag] : [],
    foundObligations: [] as readonly string[], // Phase 0 では実態 0、子 Phase 3 で計測
  }

  // Drift Budget
  const driftBudget = {
    untagged: (info.tags === null ? 1 : 0) as 0 | 1,
    unknownVocabulary: (info.tags !== null &&
    info.tags.some((t) => t.startsWith('R:') && !V1_VOCABULARY.has(t))
      ? 1
      : 0) as 0 | 1,
    missingOrigin: 1 as 0 | 1, // 全 v1 タグ Origin unknown のため Phase 0 では全て 1
  }

  return {
    axis: 'responsibility',
    target,
    currentTag,
    currentTagsRaw: info.raw,
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
// YAML serializer（minimal、軽量、no escape 必要のため自前）
// ---------------------------------------------------------------------------

const yamlEscape = (s: string): string => {
  if (/^[A-Za-z0-9_+\-./:= ]*$/.test(s) && !s.startsWith(' ') && !s.endsWith(' ')) {
    if (s === 'true' || s === 'false' || s === 'null' || /^\d/.test(s)) return `'${s}'`
    return s
  }
  // 引用 + escape (single quote: '' で escape)
  return `'${s.replace(/'/g, "''")}'`
}

const serializeEntry = (e: CanonEntry): string => {
  const lines: string[] = []
  lines.push(`- axis: ${e.axis}`)
  lines.push(`  target: ${yamlEscape(e.target)}`)
  lines.push(`  currentTag: ${yamlEscape(e.currentTag)}`)
  lines.push(
    `  currentTagsRaw: ${e.currentTagsRaw === null ? 'null' : yamlEscape(e.currentTagsRaw)}`,
  )
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
  const allFiles: string[] = []
  for (const dir of SCOPE_DIRS) {
    const abs = resolve(APP_SRC, dir)
    if (dir === 'test') {
      // test/ は guards/*.test.ts のみ対象（R:guard Anchor の archetype）
      allFiles.push(...collectFiles(abs, isGuardFile))
    } else {
      allFiles.push(...collectFiles(abs, isProductionFile))
    }
  }
  allFiles.sort()

  const entries = allFiles.map(buildEntry)

  // 集計
  const total = entries.length
  const byTag: Record<string, number> = {}
  const byAnchor: Record<string, number> = {}
  let untagged = 0
  let unknownVocabulary = 0
  let missingOrigin = 0
  let inAnchorCount = 0

  for (const e of entries) {
    byTag[e.currentTag] = (byTag[e.currentTag] ?? 0) + 1
    if (e.anchorSlice.inAnchor) {
      inAnchorCount++
      if (e.anchorSlice.anchorTag) {
        byAnchor[e.anchorSlice.anchorTag] = (byAnchor[e.anchorSlice.anchorTag] ?? 0) + 1
      }
    }
    untagged += e.driftBudget.untagged
    unknownVocabulary += e.driftBudget.unknownVocabulary
    missingOrigin += e.driftBudget.missingOrigin
  }

  // YAML 出力
  const header: string[] = []
  header.push('# Responsibility Taxonomy Inventory (Phase 0)')
  header.push('# 親 taxonomy-v2 plan.md §Common Inventory Schema (CanonEntry shape) 準拠')
  header.push(`# Generated: ${new Date().toISOString()}`)
  header.push('# Generator: tools/scripts/responsibility-taxonomy-inventory.ts')
  header.push('# 再生成: cd app && npx tsx ../tools/scripts/responsibility-taxonomy-inventory.ts')
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
  header.push('# 現 v1 タグ分布 (top 10):')
  const sortedTags = Object.entries(byTag).sort((a, b) => b[1] - a[1])
  for (const [tag, count] of sortedTags.slice(0, 10)) {
    header.push(`#   ${tag}: ${count}`)
  }
  header.push('')

  const summary = {
    schemaVersion: '1.0',
    schemaSource: 'projects/taxonomy-v2/plan.md §Common Inventory Schema',
    generatedAt: new Date().toISOString(),
    generator: 'tools/scripts/responsibility-taxonomy-inventory.ts',
    axis: 'responsibility',
    aggregate: {
      totalEntries: total,
      inAnchorSlice: inAnchorCount,
      byAnchorTag: byAnchor,
      driftBudget: {
        untagged,
        unknownVocabulary,
        missingOrigin,
      },
      tagDistribution: Object.fromEntries(sortedTags),
    },
  }

  const summaryYaml = [
    'summary:',
    `  schemaVersion: '${summary.schemaVersion}'`,
    `  schemaSource: ${yamlEscape(summary.schemaSource)}`,
    `  generatedAt: ${yamlEscape(summary.generatedAt)}`,
    `  generator: ${yamlEscape(summary.generator)}`,
    `  axis: ${summary.axis}`,
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
    `    tagDistribution:`,
    ...sortedTags.map(([k, v]) => `      ${yamlEscape(k)}: ${v}`),
    '',
  ].join('\n')

  const body = entries.map(serializeEntry).join('\n')
  const out = `${header.join('\n')}\n${summaryYaml}\nentries:\n${body}\n`

  writeFileSync(OUTPUT_PATH, out, 'utf-8')

  // stdout summary
  console.log(`✓ Generated ${OUTPUT_PATH}`)
  console.log(`  total entries: ${total}`)
  console.log(`  in Anchor Slice: ${inAnchorCount}`)
  console.log(`  Drift Budget baseline:`)
  console.log(`    untagged: ${untagged}`)
  console.log(`    unknownVocabulary: ${unknownVocabulary}`)
  console.log(`    missingOrigin: ${missingOrigin}`)
}

main()
