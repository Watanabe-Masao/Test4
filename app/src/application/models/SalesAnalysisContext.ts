/**
 * SalesAnalysisContext — 売上推移分析ユニットの共通文脈
 *
 * 日別売上チャート（overview）と時間帯別チャート（drilldown）は、
 * ダッシュボード上では独立したグラフではなく、同じ問いを掘り下げる
 * 連続した分析ユニットとして扱う。
 *
 * この型は分析ユニット全体の文脈を定義し、
 * 親コンテナ（IntegratedSalesChart）が構築して配下ビューに配る。
 *
 * Domain 層（純粋業務概念）ではなく Application 層に配置する理由:
 * - dateRange + hierarchy + selectedDayRange は分析 UI の文脈であり、
 *   ビジネスモデルの一部ではない
 * - 取得対象データの契約（禁止事項 #12）は Domain に置くが、
 *   分析 UI の操作文脈は Application に閉じる
 */
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'

// ── 階層選択 ────────────────────────────────────────────

/** カテゴリ階層の選択状態 */
export interface HierarchySelection {
  readonly deptCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
}

// ── 分析文脈 ────────────────────────────────────────────

/** 売上推移分析ユニットの共通文脈 */
export interface SalesAnalysisContext {
  /** 対象期間 */
  readonly dateRange: DateRange
  /** 比較軸（前年スコープ） */
  readonly comparisonScope?: PrevYearScope
  /** 対象店舗集合 */
  readonly selectedStoreIds: ReadonlySet<string>
  /** カテゴリ階層の絞り込み */
  readonly hierarchy: HierarchySelection
  /** 日別ビューで選択中の日付範囲（ドリルダウン中の場合） */
  readonly selectedDayRange?: {
    readonly startDay: number
    readonly endDay: number
  }
}

// ── 純粋関数: 文脈構築 ──────────────────────────────────

/** 親コンテナの状態から SalesAnalysisContext を構築する */
export function buildSalesAnalysisContext(
  dateRange: DateRange,
  selectedStoreIds: ReadonlySet<string>,
  comparisonScope?: PrevYearScope,
  selectedDayRange?: { startDay: number; endDay: number },
  hierarchy?: HierarchySelection,
): SalesAnalysisContext {
  return {
    dateRange,
    comparisonScope,
    selectedStoreIds,
    hierarchy: hierarchy ?? {},
    selectedDayRange,
  }
}

/** ドリルダウン時の子文脈を親文脈から導出する */
export function deriveChildContext(
  parent: SalesAnalysisContext,
  drillDateRange: DateRange,
  drillComparisonScope?: PrevYearScope,
): SalesAnalysisContext {
  return {
    ...parent,
    dateRange: drillDateRange,
    comparisonScope: drillComparisonScope ?? parent.comparisonScope,
  }
}
