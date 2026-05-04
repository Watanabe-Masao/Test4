/**
 * DetectorResult — AAG detector の統一 result 契約 TS implementation
 *
 * **canonical contract**:
 *   `docs/contracts/aag/detector-result.schema.json` (JSON Schema draft-07)
 *   = aag-platformization Pilot Phase 1 / A3 で landed (forward-looking)。
 *   actual integration は post-Pilot に分離されており、本 module
 *   (`aag-engine-readiness-refactor` Phase 2 deliverable) で TS
 *   implementation + 5 系統 adoption 経路を articulate する。
 *
 * **責務**:
 *   - schema 準拠の TS type を提供 (= structurally identical)
 *   - factory function (= `createDetectorResult`) で field validation を local 化
 *   - `AagResponse` への変換 helper (= human-readable 経路と分離)
 *   - JSON 直 serialize 経路 (= engine consumption 用)
 *
 * **AagResponse との関係**:
 *   - `DetectorResult` = detector 内部の machine-readable result (= engine が emit)
 *   - `AagResponse` = AI 通知契約の最終 response (= renderer が emit)
 *   - 1 つの違反は `DetectorResult` として detect → renderer 経由で `AagResponse` に変換
 *
 * **不可侵原則 (= aag-engine-readiness-refactor plan.md 不可侵原則 2)**:
 *   既存 guard / collector の検出条件 / hard gate / KPI 閾値は変えない。
 *   本 module は **追加** 経路として導入され、既存 AagResponse 経路は維持される。
 *
 * @see docs/contracts/aag/detector-result.schema.json (canonical contract)
 * @see app/src/test/guards/aagContractSchemaSyncGuard.test.ts (sync verification)
 * @see tools/architecture-health/src/aag-response.ts (= AagResponse 通知契約 TS implementation)
 * @see references/03-implementation/aag-engine-readiness-inventory.md §6.1 (= 5 系統 articulate)
 */

import type { AagResponse, AagSlice, FixNow } from './aag-response.js'

// ───────────────────────────────────────────────────────────────────────
// type definitions (= schema structurally identical)
// ───────────────────────────────────────────────────────────────────────

/**
 * `severity` enum (= schema enum と一致):
 *   - `gate`        = CI fail + マージ block
 *   - `block-merge` = CI warn + マージ block
 *   - `warn`        = CI warn + マージ allow
 */
export type DetectorSeverity = 'gate' | 'warn' | 'block-merge'

/**
 * `DetectorResult` = AAG detector が emit する machine-readable 違反 result。
 *
 * field 順序は `docs/contracts/aag/detector-result.schema.json` の
 * `required` + `properties` 並び順に揃える (= sync guard で機械検証)。
 */
export interface DetectorResult {
  /** AR rule id (例: AR-AAG-DERIVED-ONLY-IMPORT)。base-rules.ts の rule.id に対応。 */
  readonly ruleId: string

  /** 検出 type (例: layer-boundary / canonicalization / etc.)。BaseRule.detection.type と整合。 */
  readonly detectionType: string

  /** 違反検出元の file path (repo-relative POSIX、例: app/src/test/architectureRules/merged.ts)。 */
  readonly sourceFile: string

  /** Severity (= CI / マージ判定への impact)。 */
  readonly severity: DetectorSeverity

  /** 違反の evidence (= 具体 code snippet / regex match 等)。 */
  readonly evidence?: string

  /** ratchet-down 系 guard における現在カウント。 */
  readonly actual?: number

  /** ratchet-down 系 guard における baseline 上限。 */
  readonly baseline?: number

  /** AagResponse.summary / reason 生成のための seed message。 */
  readonly messageSeed?: string
}

// ───────────────────────────────────────────────────────────────────────
// factory
// ───────────────────────────────────────────────────────────────────────

/**
 * `DetectorResult` を生成する factory。schema required field を必ず articulate
 * させ、optional field は `undefined` を strict に handle する。
 *
 * field validation:
 *   - `ruleId` / `detectionType` / `sourceFile` / `messageSeed`: 1 文字以上を要求
 *     (= schema で minLength は articulate していないが、空文字列は意味を持たない)
 *   - `severity`: enum 検証
 *   - `actual` / `baseline`: 同時 articulate を recommend (= ratchet-down 系で意味を持つ pair)
 */
export function createDetectorResult(input: DetectorResult): DetectorResult {
  if (input.ruleId.length === 0) {
    throw new Error('DetectorResult: ruleId must be non-empty')
  }
  if (input.detectionType.length === 0) {
    throw new Error('DetectorResult: detectionType must be non-empty')
  }
  if (input.sourceFile.length === 0) {
    throw new Error('DetectorResult: sourceFile must be non-empty')
  }

  // optional field の strictness check
  if (input.evidence !== undefined && input.evidence.length === 0) {
    throw new Error('DetectorResult: evidence must be non-empty when present (use undefined to omit)')
  }
  if (input.messageSeed !== undefined && input.messageSeed.length === 0) {
    throw new Error('DetectorResult: messageSeed must be non-empty when present (use undefined to omit)')
  }

  return Object.freeze({
    ruleId: input.ruleId,
    detectionType: input.detectionType,
    sourceFile: input.sourceFile,
    severity: input.severity,
    evidence: input.evidence,
    actual: input.actual,
    baseline: input.baseline,
    messageSeed: input.messageSeed,
  })
}

// ───────────────────────────────────────────────────────────────────────
// renderer separation (= machine output → human / json)
// ───────────────────────────────────────────────────────────────────────

/**
 * `DetectorSeverity` → `AagResponse.fixNow` mapping。
 *
 *   - `gate`        → `'now'` (= 即修正、CI fail)
 *   - `block-merge` → `'now'` (= 即修正、マージ block)
 *   - `warn`        → `'debt'` (= allowlist 管理 / 計画的返済)
 *
 * `'review'` (= Discovery Review 対象) は detector severity から自動導出しない (=
 * Discovery Review 判断は人間判断、`AagResponse` builder で明示的に articulate
 * すべき)。
 */
function severityToFixNow(severity: DetectorSeverity): FixNow {
  switch (severity) {
    case 'gate':
      return 'now'
    case 'block-merge':
      return 'now'
    case 'warn':
      return 'debt'
  }
}

/**
 * 1 件の `DetectorResult` を 1 件の violation 文字列に articulate (= AagResponse.violations
 * の要素形式)。renderer 経由で human-readable に展開される。
 */
function detectorResultToViolationLine(result: DetectorResult): string {
  const parts: string[] = [`[${result.ruleId}] ${result.sourceFile}`]
  if (result.evidence !== undefined) {
    parts.push(`evidence: ${result.evidence}`)
  }
  if (result.actual !== undefined && result.baseline !== undefined) {
    parts.push(`actual: ${result.actual} / baseline: ${result.baseline}`)
  }
  return parts.join(' — ')
}

/**
 * `DetectorResult[]` を 1 件の `AagResponse` に集約する。同種 violation を
 * batch で通知する経路 (= 既存 collector / guard が違反複数を 1 response で
 * 通知する pattern と整合)。
 *
 * @param results 同 detector が emit した DetectorResult[]
 * @param options summary / slice / steps / deepDive 等の articulate
 */
export interface AggregateOptions {
  /** AagResponse.summary。空の場合は ruleId + 件数から自動生成。 */
  readonly summary?: string
  /** AagResponse.reason。空の場合は messageSeed の最初を使用。 */
  readonly reason?: string
  /** AagResponse.slice (= AAG 5 縦スライス、null = スライス非依存)。 */
  readonly slice?: AagSlice | null
  /** 修正手順。 */
  readonly steps?: readonly string[]
  /** 例外 articulate (= allowlist 管理対象等)。 */
  readonly exceptions?: string | null
  /** 詳細 doc / 参照先。 */
  readonly deepDive?: string | null
  /** AagResponse.source (= guard / obligation / health / pre-commit)。default = 'health'。 */
  readonly source?: AagResponse['source']
}

export function aggregateDetectorResults(
  results: readonly DetectorResult[],
  options: AggregateOptions = {},
): AagResponse {
  const violations = results.map(detectorResultToViolationLine)
  const ruleIds = Array.from(new Set(results.map((r) => r.ruleId)))

  // severity 集約: gate / block-merge が 1 件でもあれば 'now'、すべて warn なら 'debt'
  const fixNow: FixNow =
    results.some((r) => r.severity === 'gate' || r.severity === 'block-merge')
      ? 'now'
      : results.length > 0 && results.every((r) => r.severity === 'warn')
        ? 'debt'
        : 'now'

  const summary =
    options.summary ??
    `${ruleIds.length === 1 ? ruleIds[0] : `${ruleIds.length} rule(s)`}: ${results.length} violation(s)`

  const firstSeed =
    results
      .map((r) => r.messageSeed)
      .filter((seed): seed is string => seed !== undefined)
      .slice(0, 1)
      .join('') || `${results.length} 件の違反が検出されました`
  const reason = options.reason ?? firstSeed

  return {
    source: options.source ?? 'health',
    fixNow,
    slice: options.slice ?? null,
    summary,
    reason,
    steps: options.steps ?? [],
    exceptions: options.exceptions ?? null,
    deepDive: options.deepDive ?? null,
    violations,
  }
}

/**
 * 1 件の `DetectorResult` から 1 件の `AagResponse` を生成。
 * 単一 violation を即時通知する経路 (= per-file detection に対応)。
 */
export function detectorResultToAagResponse(
  result: DetectorResult,
  options: AggregateOptions = {},
): AagResponse {
  return aggregateDetectorResults([result], {
    ...options,
    summary: options.summary ?? result.messageSeed ?? `${result.ruleId}: violation detected`,
    reason: options.reason ?? `${result.sourceFile} で違反検出`,
    source: options.source ?? 'health',
  })
}

/**
 * `DetectorResult[]` を JSON 文字列に直 serialize (= engine consumption 用)。
 * `AagResponse` を経由せず、machine-readable な状態で外部に渡す経路。
 *
 * 出力形式は `docs/contracts/aag/detector-result.schema.json` の object array。
 * 各要素の field 順序は `severity` で sort、tie-break は `ruleId` + `sourceFile`。
 */
export function renderDetectorResultsAsJson(
  results: readonly DetectorResult[],
  options: { readonly indent?: number } = {},
): string {
  const SEVERITY_RANK: Readonly<Record<DetectorSeverity, number>> = {
    gate: 0,
    'block-merge': 1,
    warn: 2,
  }

  const sorted = [...results].sort((a, b) => {
    const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (rankDiff !== 0) return rankDiff
    const ruleDiff = a.ruleId.localeCompare(b.ruleId)
    if (ruleDiff !== 0) return ruleDiff
    return a.sourceFile.localeCompare(b.sourceFile)
  })

  return JSON.stringify(sorted, null, options.indent ?? 2)
}
