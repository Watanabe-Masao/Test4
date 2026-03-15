/**
 * ウィジェットレイアウト管理ユーティリティ
 *
 * ダッシュボードのレイアウト永続化・デフォルト構成・自動注入ロジック。
 * registry.tsx から分離した非コンポーネントエクスポート。
 */
import { WIDGET_REGISTRY } from './registry'
import type { WidgetDef } from './types'

export const WIDGET_MAP = new Map<string, WidgetDef>(WIDGET_REGISTRY.map((w) => [w.id, w]))

export const DEFAULT_WIDGET_IDS: string[] = [
  // 予算進捗ハブ（最上位: 予算達成 + 店別ドリルダウン + 予算ヘッダ）
  'widget-budget-achievement',
  // モニタリング
  'analysis-condition-summary',
  'analysis-alert-panel',
  // 収益概況テーブル（主1+Sub2, 主2+Sub1）
  'kpi-summary-table',
  // 予実管理
  'exec-plan-actual-forecast',
  'insight-budget',
  // 着地予測
  'exec-forecast-tools',
]

const STORAGE_KEY = 'dashboard_layout_v13'

/**
 * 旧 DuckDB 専用ウィジェット ID → 統合ウィジェット ID へのマイグレーションマップ。
 * ユーザーの保存済みレイアウトに旧 ID が含まれている場合、自動的に統合 ID に変換する。
 */
const WIDGET_ID_MIGRATION: ReadonlyMap<string, string> = new Map([
  ['duckdb-timeslot', 'chart-timeslot-sales'],
  ['duckdb-heatmap', 'chart-timeslot-heatmap'],
  ['duckdb-dept-hourly', 'chart-dept-hourly-pattern'],
  ['duckdb-store-hourly', 'chart-store-timeslot-comparison'],
  ['analysis-duckdb-yoy', 'analysis-yoy-variance'],
  // Daily KPI統合マイグレーション
  ['daily-kpi-sales', 'kpi-summary-table'],
  ['daily-kpi-cost', 'kpi-summary-table'],
  ['daily-kpi-discount', 'kpi-summary-table'],
  ['daily-kpi-gp-rate', 'kpi-summary-table'],
  ['daily-kpi-markup', 'kpi-summary-table'],
  ['daily-kpi-cost-inclusion', 'kpi-summary-table'],
  ['daily-chart-sales', 'chart-daily-sales'],
  // KPIカード → 統合テーブルへのマイグレーション
  ['kpi-core-sales', 'kpi-summary-table'],
  ['kpi-total-cost', 'kpi-summary-table'],
  ['kpi-inv-gross-profit', 'kpi-summary-table'],
  ['kpi-est-margin', 'kpi-summary-table'],
  ['kpi-inventory-cost', 'kpi-summary-table'],
  ['kpi-delivery-sales', 'kpi-summary-table'],
  ['kpi-cost-inclusion', 'kpi-summary-table'],
  ['kpi-discount-loss', 'kpi-summary-table'],
  ['kpi-core-markup', 'kpi-summary-table'],
  // 前年比較 → ConditionSummaryEnhancedヘッダに吸収
  ['kpi-py-same-dow', 'widget-budget-achievement'],
  ['kpi-py-same-date', 'widget-budget-achievement'],
  ['kpi-dow-gap', 'widget-budget-achievement'],
  // ExecSummaryBar → 統合テーブル + ConditionSummaryEnhancedに吸収
  ['exec-summary-bar', 'kpi-summary-table'],
])

/** 旧 ID を統合 ID に変換し、重複を除去する */
function migrateWidgetIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    const migrated = WIDGET_ID_MIGRATION.get(id) ?? id
    if (!seen.has(migrated)) {
      seen.add(migrated)
      result.push(migrated)
    }
  }
  return result
}

export function loadLayout(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_WIDGET_IDS
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return DEFAULT_WIDGET_IDS
    const migrated = migrateWidgetIds(parsed)
    const valid = migrated.filter((id) => WIDGET_MAP.has(id))
    return valid.length > 0 ? valid : DEFAULT_WIDGET_IDS
  } catch {
    return DEFAULT_WIDGET_IDS
  }
}

export function saveLayout(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

/**
 * データ駆動ウィジェットの自動注入
 *
 * isVisible が設定されたウィジェットのうち、
 * まだユーザーのレイアウトに含まれておらず、
 * 過去に注入→除外された記録がないものを自動追加する。
 */
const AUTO_INJECTED_KEY = 'dashboard_auto_injected_v3'

function getAutoInjectedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(AUTO_INJECTED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveAutoInjectedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(AUTO_INJECTED_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

/**
 * データ有無に応じてウィジェットを自動注入する。
 * 初回のみ追加し、ユーザーが削除した場合は再注入しない。
 *
 * @returns 更新後の widgetIds（変更なしなら null）
 */
/** DuckDB 専用ウィジェットIDかどうか判定する（統合済みは除外） */
function isDuckDBOnlyWidget(id: string): boolean {
  // 統合済み ID はここには含まれない（chart-*, analysis-yoy-variance は統合ウィジェット）
  return id.startsWith('duckdb-') || id.startsWith('analysis-duckdb-')
}

/** DuckDB 時系列ウィジェット（旧: 統合ウィジェット、CTS フォールバック廃止済み）のID */
const DUCKDB_TIMESERIES_WIDGET_IDS = new Set([
  'chart-timeslot-sales',
  'chart-timeslot-heatmap',
  'chart-dept-hourly-pattern',
  'chart-store-timeslot-comparison',
  'analysis-yoy-variance',
  'chart-category-hierarchy-explorer',
  'analysis-category-pi',
])

export function autoInjectDataWidgets(
  currentIds: string[],
  ctx: {
    prevYearHasPrevYear: boolean
    storeCount: number
    hasDiscountData?: boolean
    isDuckDBReady?: boolean
  },
): string[] | null {
  const seen = getAutoInjectedIds()
  // 旧 DuckDB ID も注入済みとして扱う（重複注入防止）
  for (const [oldId, newId] of WIDGET_ID_MIGRATION) {
    if (seen.has(oldId)) seen.add(newId)
  }
  const candidates = WIDGET_REGISTRY.filter((w) => {
    if (!w.isVisible) return false
    // 既にレイアウトにある or 過去に注入済み → スキップ
    if (currentIds.includes(w.id) || seen.has(w.id)) return false
    // DuckDB 専用ウィジェット: DuckDB 初期化完了を待って注入
    if (isDuckDBOnlyWidget(w.id)) {
      if (!ctx.isDuckDBReady) return false
      return true
    }
    // DuckDB 時系列ウィジェット: DuckDB 初期化完了を待って注入
    if (DUCKDB_TIMESERIES_WIDGET_IDS.has(w.id)) {
      if (!ctx.isDuckDBReady) return false
      if (w.id === 'chart-store-timeslot-comparison') return ctx.storeCount > 1
      if (w.id === 'analysis-yoy-variance') return ctx.prevYearHasPrevYear
      return true
    }
    // 従来ウィジェットの既存ロジック
    if (w.id === 'analysis-yoy-waterfall') {
      return ctx.prevYearHasPrevYear
    }
    // 店別予算達成: 複数店舗時のみ自動注入
    if (w.id === 'widget-budget-achievement') {
      return ctx.storeCount > 1
    }
    if (w.id === 'chart-discount-breakdown') {
      return ctx.hasDiscountData === true
    }
    return true
  })

  if (candidates.length === 0) return null

  const newSeen = new Set(seen)
  for (const c of candidates) newSeen.add(c.id)
  saveAutoInjectedIds(newSeen)

  return [...currentIds, ...candidates.map((c) => c.id)]
}
