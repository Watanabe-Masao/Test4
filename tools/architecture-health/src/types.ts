/**
 * Architecture Health — 型定義
 *
 * 全 KPI を「リンク可能なオブジェクト」として構造化する。
 * 正本は JSON。Markdown はビュー。
 */

// ---------------------------------------------------------------------------
// KPI
// ---------------------------------------------------------------------------

export type KpiStatus = 'ok' | 'warn' | 'fail'
export type KpiUnit = 'count' | 'percent' | 'lines' | 'kb' | 'ms' | 'seconds'
export type KpiCategory =
  | 'allowlist'
  | 'compatibility_debt'
  | 'complexity'
  | 'boundary'
  | 'guard'
  | 'docs'
  | 'build_perf'
  | 'bundle_perf'
  | 'query_perf'
  | 'e2e_perf'

export interface DocRef {
  readonly kind: 'definition' | 'source' | 'guard' | 'roadmap' | 'ui'
  readonly path: string
  readonly section?: string
}

export interface HealthKpi {
  readonly id: string
  readonly label: string
  readonly category: KpiCategory
  readonly value: number
  readonly unit: KpiUnit
  readonly status: KpiStatus
  readonly budget?: number
  readonly trend?: 'better' | 'same' | 'worse'
  readonly owner: string
  readonly docRefs: readonly DocRef[]
  readonly implRefs: readonly string[]
  /**
   * KPI の算出元。省略時は 'source-code'（常に算出可能）。
   * 'build-artifact' は dist/ 等のビルド成果物に依存し、
   * ビルド未実行環境では算出不能。
   */
  readonly source?: 'source-code' | 'build-artifact'
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface HealthReport {
  readonly schemaVersion: '1.0.0'
  readonly timestamp: string
  readonly kpis: readonly HealthKpi[]
  readonly summary: HealthSummary
}

export interface HealthSummary {
  readonly totalKpis: number
  readonly ok: number
  readonly warn: number
  readonly fail: number
  readonly hardGatePass: boolean
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export type RuleType = 'hard_gate' | 'soft_gate' | 'trend_gate' | 'info'
export type RuleOperator = 'eq' | 'lte' | 'gte' | 'lt' | 'gt'

export interface HealthRule {
  readonly id: string
  readonly type: RuleType
  readonly operator: RuleOperator
  readonly target: number
}

// ---------------------------------------------------------------------------
// Snapshot (既存形式の入力型)
// ---------------------------------------------------------------------------

export interface SnapshotBridge {
  readonly path: string
  readonly lines: number
}

export interface SnapshotHotspot {
  readonly file: string
  readonly memoCount: number
  readonly stateCount: number
  readonly lineCount: number
}

export interface SnapshotNearLimit {
  readonly file: string
  readonly metric: string
  readonly actual: number
  readonly limit: number
  readonly pct: number
}

export interface SnapshotListEntry {
  readonly count: number
  readonly categories: Record<string, number>
}

export interface ArchitectureSnapshot {
  readonly timestamp: string
  readonly totalAllowlistEntries: number
  readonly categoryBreakdown: Record<string, number>
  readonly frozenLists: readonly string[]
  readonly frozenCount: number
  readonly activeLists: number
  readonly vmFileCount: number
  readonly compatReexportCount: number
  readonly activeBridges: readonly SnapshotBridge[]
  readonly facadeHooks: readonly string[]
  readonly complexityHotspots: readonly SnapshotHotspot[]
  readonly nearLimitFiles: readonly SnapshotNearLimit[]
  readonly listSummary: Record<string, SnapshotListEntry>
}
