/**
 * AAG Drawer Generator (A5 Generated)
 *
 * AI が必要 rule subset に最短経路で reach できるようにする drawer artifact 群を
 * 生成する。canonical = `BASE_RULES` (= base-rules.ts)、本 generator はそれから
 * 派生する 3 種 routing artifact を生成。
 *
 * 出力 (`docs/generated/aag/`):
 *   - `rule-index.json`     — rule id + 1 行 summary + slice + tags (軽量 overview)
 *   - `rules-by-path.json`  — path / import → rule id (path-triggered access)
 *   - `rule-by-topic.json`  — slice / responsibilityTag / guardTag → rule id (topic discovery)
 *
 * **canonical**: source-of-truth.md §3 派生物一覧 + 本 generator のロジック自体は
 *   merged.ts (= source-of-truth.md §4 Merge Policy implementation) に back-link。
 *
 * **post-Pilot AI Role Layer seam** (= 3 seams articulation):
 *   各 rule entry に optional `_seam` field を持たせる。`consumerKind` (= post-Pilot
 *   role candidate) / `taskHint` (= task class candidate) / `sourceRefs` (= reads target)
 *   は free-form (Phase 3 charter で formal articulate されるまで forward
 *   compatibility 用)。
 *
 * 個別 `rule-detail/<id>.json` は merged-architecture-rules.json (A2b) で代替済
 *   (= rule 全 field を含む single canonical artifact)、本 A5 では生成しない。
 *
 * @responsibility R:utility
 * @see aag/_internal/source-of-truth.md §4 (Merge Policy canonical)
 * @see app/src/test/architectureRules/merge-artifact-generator.ts (A2b、本 generator の sibling)
 */

import { resolve } from 'node:path'
import { execSync } from 'node:child_process'
import { ARCHITECTURE_RULES as BASE_RULES } from '@app-domain/gross-profit/rule-catalog/base-rules'
import type { BaseRule } from '@/test/architectureRules/types'

export const RULE_INDEX_PATH = 'docs/generated/aag/rule-index.json'
export const RULES_BY_PATH_PATH = 'docs/generated/aag/rules-by-path.json'
export const RULE_BY_TOPIC_PATH = 'docs/generated/aag/rule-by-topic.json'

interface RouteSeam {
  readonly consumerKind: string
  readonly taskHint: string
  readonly sourceRefs: readonly string[]
}

interface RuleIndexEntry {
  readonly id: string
  readonly what: string
  readonly slice: string | null
  readonly fixNow: string | null
  readonly responsibilityTags: readonly string[]
  readonly guardTags: readonly string[]
  readonly _seam: RouteSeam
}

interface RuleIndexArtifact {
  readonly $schemaDescription: string
  readonly canonicalSource: string
  readonly schemaVersion: '1.0.0'
  readonly generatedAt: string
  readonly sourceCommit: string
  readonly summary: { readonly totalRules: number }
  readonly rules: readonly RuleIndexEntry[]
}

interface RulesByPathArtifact {
  readonly $schemaDescription: string
  readonly canonicalSource: string
  readonly schemaVersion: '1.0.0'
  readonly generatedAt: string
  readonly sourceCommit: string
  readonly summary: {
    readonly totalRules: number
    readonly mappedRules: number
    readonly unmappedRules: number
  }
  readonly byImport: Readonly<Record<string, readonly string[]>>
  readonly bySignal: Readonly<Record<string, readonly string[]>>
  readonly unmapped: readonly string[]
}

interface RuleByTopicArtifact {
  readonly $schemaDescription: string
  readonly canonicalSource: string
  readonly schemaVersion: '1.0.0'
  readonly generatedAt: string
  readonly sourceCommit: string
  readonly summary: {
    readonly totalRules: number
    readonly slices: number
    readonly responsibilityTags: number
    readonly guardTags: number
  }
  readonly bySlice: Readonly<Record<string, readonly string[]>>
  readonly byResponsibilityTag: Readonly<Record<string, readonly string[]>>
  readonly byGuardTag: Readonly<Record<string, readonly string[]>>
}

const repoRoot = resolve(__dirname, '../../../..')

function getSourceCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8', cwd: repoRoot }).trim()
  } catch {
    return 'unknown'
  }
}

function classifyConsumerKind(rule: BaseRule): string {
  // Heuristic: slice → consumer kind candidate (forward compatibility seam)
  switch (rule.slice) {
    case 'layer-boundary':
      return 'authority-auditor'
    case 'canonicalization':
      return 'authority-auditor'
    case 'query-runtime':
      return 'derivation-assembler'
    case 'responsibility-separation':
      return 'binding-auditor'
    case 'governance-ops':
      return 'policy-enforcer'
    default:
      return 'unclassified'
  }
}

function classifyTaskHint(rule: BaseRule): string {
  // Heuristic: detection.type → task hint
  return rule.detection?.type ?? 'unclassified'
}

function buildSourceRefs(rule: BaseRule): readonly string[] {
  const refs: string[] = []
  if (rule.doc) refs.push(rule.doc)
  if (rule.canonicalDocRef?.refs) {
    for (const r of rule.canonicalDocRef.refs) {
      if (r.docPath) refs.push(r.docPath)
    }
  }
  return [...new Set(refs)]
}

function buildSeam(rule: BaseRule): RouteSeam {
  return {
    consumerKind: classifyConsumerKind(rule),
    taskHint: classifyTaskHint(rule),
    sourceRefs: buildSourceRefs(rule),
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

export function buildRuleIndex(): RuleIndexArtifact {
  const rules: RuleIndexEntry[] = BASE_RULES.map((rule) => ({
    id: rule.id,
    what: truncate(rule.what ?? '', 120),
    slice: rule.slice ?? null,
    fixNow: null, // operational state は merged-architecture-rules.json (A2b) を参照
    responsibilityTags: [...(rule.responsibilityTags ?? [])],
    guardTags: [...(rule.guardTags ?? [])],
    _seam: buildSeam(rule),
  }))
  return {
    $schemaDescription:
      'Rule Index — 軽量 overview drawer。AI が rule 全景を 1 read で把握する用途。詳細は merged-architecture-rules.json (A2b) 参照。',
    canonicalSource: 'app-domain/gross-profit/rule-catalog/base-rules.ts',
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    sourceCommit: getSourceCommit(),
    summary: { totalRules: rules.length },
    rules,
  }
}

export function buildRulesByPath(): RulesByPathArtifact {
  const byImport: Record<string, string[]> = {}
  const bySignal: Record<string, string[]> = {}
  const mappedSet = new Set<string>()

  for (const rule of BASE_RULES) {
    const imports = [
      ...(rule.outdatedPattern?.imports ?? []),
      ...(rule.correctPattern?.imports ?? []),
    ]
    const signals = rule.outdatedPattern?.codeSignals ?? []

    for (const imp of imports) {
      if (!byImport[imp]) byImport[imp] = []
      if (!byImport[imp].includes(rule.id)) byImport[imp].push(rule.id)
      mappedSet.add(rule.id)
    }
    for (const sig of signals) {
      if (!bySignal[sig]) bySignal[sig] = []
      if (!bySignal[sig].includes(rule.id)) bySignal[sig].push(rule.id)
      mappedSet.add(rule.id)
    }
  }

  const unmapped = BASE_RULES.filter((r) => !mappedSet.has(r.id)).map((r) => r.id)

  return {
    $schemaDescription:
      'Rules-by-Path — import / codeSignal → rule id index。path-triggered access 用 (= AI が編集 file の関連 rule subset に reach する経路)。unmapped = imports / signals 不在の rule (= general rule、特定 path に紐付かない)。',
    canonicalSource:
      'app-domain/gross-profit/rule-catalog/base-rules.ts (outdatedPattern + correctPattern)',
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    sourceCommit: getSourceCommit(),
    summary: {
      totalRules: BASE_RULES.length,
      mappedRules: mappedSet.size,
      unmappedRules: unmapped.length,
    },
    byImport,
    bySignal,
    unmapped,
  }
}

export function buildRuleByTopic(): RuleByTopicArtifact {
  const bySlice: Record<string, string[]> = {}
  const byResponsibilityTag: Record<string, string[]> = {}
  const byGuardTag: Record<string, string[]> = {}

  for (const rule of BASE_RULES) {
    if (rule.slice) {
      if (!bySlice[rule.slice]) bySlice[rule.slice] = []
      bySlice[rule.slice].push(rule.id)
    }
    for (const tag of rule.responsibilityTags ?? []) {
      if (!byResponsibilityTag[tag]) byResponsibilityTag[tag] = []
      byResponsibilityTag[tag].push(rule.id)
    }
    for (const tag of rule.guardTags ?? []) {
      if (!byGuardTag[tag]) byGuardTag[tag] = []
      byGuardTag[tag].push(rule.id)
    }
  }

  return {
    $schemaDescription:
      'Rule-by-Topic — slice / responsibilityTag / guardTag → rule id index。topic discovery 用 (= AI が業務領域 / 責務 / guard 種別から関連 rule に reach する経路)。manifest.json discovery 拡張の seam。',
    canonicalSource:
      'app-domain/gross-profit/rule-catalog/base-rules.ts (slice / responsibilityTags / guardTags)',
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    sourceCommit: getSourceCommit(),
    summary: {
      totalRules: BASE_RULES.length,
      slices: Object.keys(bySlice).length,
      responsibilityTags: Object.keys(byResponsibilityTag).length,
      guardTags: Object.keys(byGuardTag).length,
    },
    bySlice,
    byResponsibilityTag,
    byGuardTag,
  }
}
