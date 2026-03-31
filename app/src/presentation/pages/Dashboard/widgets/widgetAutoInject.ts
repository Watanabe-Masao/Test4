/**
 * widgetAutoInject — データ駆動ウィジェットの自動注入ロジック。
 * widgetLayout.ts から分離。localStorage ベースの冪等性を保証する。
 */
import { WIDGET_REGISTRY } from './registry'
import { WIDGET_ID_MIGRATION } from './widgetMigration'

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

/** DuckDB 専用ウィジェットIDかどうか判定する（統合済みは除外） */
function isDuckDBOnlyWidget(id: string): boolean {
  return id.startsWith('duckdb-') || id.startsWith('analysis-duckdb-')
}

/** DuckDB 時系列ウィジェット（CTS フォールバック廃止済み）のID */
const DUCKDB_TIMESERIES_WIDGET_IDS = new Set([
  'chart-timeslot-sales',
  'chart-timeslot-heatmap',
  'chart-store-timeslot-comparison',
  'analysis-yoy-variance',
  'analysis-category-pi',
])

/**
 * データ有無に応じてウィジェットを自動注入する。
 * 初回のみ追加し、ユーザーが削除した場合は再注入しない。
 *
 * @returns 更新後の widgetIds（変更なしなら null）
 */
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
      return true
    }
    // 店別予算達成: 複数店舗時のみ自動注入
    if (w.id === 'widget-budget-achievement') {
      return ctx.storeCount > 1
    }
    return true
  })

  if (candidates.length === 0) return null

  const newSeen = new Set(seen)
  for (const c of candidates) newSeen.add(c.id)
  saveAutoInjectedIds(newSeen)

  return [...currentIds, ...candidates.map((c) => c.id)]
}
