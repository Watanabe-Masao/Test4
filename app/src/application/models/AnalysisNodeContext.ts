/**
 * AnalysisNodeContext — 分析ノードの階層モデル
 *
 * 包含型分析ユニット（日別→時間帯→部門別時間帯、カテゴリ→ドリルダウン）の
 * 親子孫関係を型で表現する。
 *
 * 設計原則:
 * - base (SalesAnalysisContext) に文脈を委譲する。dateRange / comparisonScope /
 *   selectedStoreIds を AnalysisNodeContext 側で再定義しない
 * - deriveChildContext() が文脈派生の唯一の入口
 * - deriveNodeContext() はノード化・フォーカス付与のみ（base を不変参照で受け継ぐ）
 * - 文脈変更が必要な場合は deriveChildContext() を先に通してから deriveNodeContext() を作る
 *
 * @responsibility R:unclassified
 */
import type { SalesAnalysisContext } from './SalesAnalysisContext'
import type { CategoryFocus } from './AnalysisViewEvents'

// ── ノード種別 ───────────────────────────────────────────

/** 分析ノードの種類 */
export type AnalysisNodeType =
  | 'daily-sales'
  | 'time-slot'
  | 'time-slot-department-pattern'
  | 'category-trend'
  | 'category-drilldown'

// ── フォーカス（tagged union） ───────────────────────────

/**
 * 各ノードが追加する絞り込み条件。
 * tagged union で汎用にしすぎない。
 */
export type AnalysisFocus =
  | { readonly kind: 'day-range'; readonly startDay: number; readonly endDay: number }
  | { readonly kind: 'hour'; readonly hour: number }
  | {
      readonly kind: 'category'
      readonly level: 'department' | 'line' | 'klass'
      readonly code: string
      readonly name: string
    }

// ── 上位部門選定ポリシー ─────────────────────────────────

/**
 * 部門別時間帯パターンの「上位N部門」選定仕様。
 * UI で ad hoc に決めず、Application 側で明示的に定義する。
 */
export type TopDepartmentPolicy = {
  readonly count: number
  readonly criterion: 'current-total-sales' | 'selected-range-sales'
  readonly includeComparison: boolean
}

/** デフォルトの上位部門選定ポリシー */
export const DEFAULT_TOP_DEPARTMENT_POLICY: TopDepartmentPolicy = {
  count: 5,
  criterion: 'current-total-sales',
  includeComparison: false,
}

// ── 分析ノード文脈 ───────────────────────────────────────

/**
 * 分析ノード文脈 — 親子孫の継承関係を UI・ロジック両方で揃える。
 *
 * 最小構造: base に SalesAnalysisContext を委譲し、
 * ノード固有のメタデータ（nodeType, focus, topDepartmentPolicy）のみを持つ。
 */
export interface AnalysisNodeContext {
  /** 分析文脈の本体（authoritative source） */
  readonly base: SalesAnalysisContext
  /** このノードの種類 */
  readonly nodeType: AnalysisNodeType
  /** 親ノードの種類（ルートの場合は undefined） */
  readonly parentNodeType?: AnalysisNodeType
  /** このノードが追加するフォーカス条件 */
  readonly focus?: AnalysisFocus
  /** 部門別時間帯パターン専用: 上位部門選定ポリシー */
  readonly topDepartmentPolicy?: TopDepartmentPolicy
}

// ── 純粋関数: ノード文脈の導出 ───────────────────────────

/**
 * 親ノードから子ノード文脈を導出する。
 *
 * base はそのまま受け継ぐ（不変参照）。
 * 文脈変更（dateRange/comparisonScope の上書き）が必要な場合は、
 * 先に deriveChildContext() で SalesAnalysisContext を派生させてから
 * この関数に渡すこと。
 */
export function deriveNodeContext(
  parent: AnalysisNodeContext,
  childType: AnalysisNodeType,
  options?: {
    readonly focus?: AnalysisFocus
    readonly topDepartmentPolicy?: TopDepartmentPolicy
    readonly overrideBase?: SalesAnalysisContext
  },
): AnalysisNodeContext {
  return {
    base: options?.overrideBase ?? parent.base,
    nodeType: childType,
    parentNodeType: parent.nodeType,
    focus: options?.focus,
    topDepartmentPolicy: options?.topDepartmentPolicy,
  }
}

/**
 * ルートノード文脈を構築する。
 * 分析ユニットの最上位（日別売上推移 or カテゴリ別売上推移）で使う。
 */
export function buildRootNodeContext(
  base: SalesAnalysisContext,
  nodeType: AnalysisNodeType,
): AnalysisNodeContext {
  return {
    base,
    nodeType,
  }
}

// ── 孫用文脈の導出（Phase 6 で追加予定） ─────────────────

/**
 * 時間帯ノードから部門別時間帯パターンの孫文脈を導出する。
 *
 * base は親からそのまま継承（不変参照）。
 * topDepartmentPolicy は呼び出し側が明示的に渡す。
 */
export function deriveDeptPatternContext(
  parent: AnalysisNodeContext,
  policy: TopDepartmentPolicy,
): AnalysisNodeContext {
  return deriveNodeContext(parent, 'time-slot-department-pattern', {
    topDepartmentPolicy: policy,
  })
}

/**
 * カテゴリトレンドからカテゴリードリルダウンの子文脈を導出する。
 *
 * base は親からそのまま継承（不変参照）。
 * categoryFocus は呼び出し側が明示的に渡す。
 */
export function deriveCategoryDrilldownContext(
  parent: AnalysisNodeContext,
  categoryFocus: CategoryFocus,
): AnalysisNodeContext {
  return deriveNodeContext(parent, 'category-drilldown', {
    focus: {
      kind: 'category',
      level: categoryFocus.level,
      code: categoryFocus.code,
      name: categoryFocus.name,
    },
  })
}
