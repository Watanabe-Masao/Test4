/**
 * widgetAutoInject — データ駆動ウィジェットの自動注入ロジック。
 * widgetLayout.ts から分離。localStorage ベースの冪等性を保証する。
 *
 * @responsibility R:unclassified
 */
import { loadJson, saveJson } from '@/application/adapters/uiPersistenceAdapter'
import { WIDGET_REGISTRY } from './registry'
import { WIDGET_ID_MIGRATION } from './widgetMigration'

const AUTO_INJECTED_KEY = 'dashboard_auto_injected_v3'

function getAutoInjectedIds(): Set<string> {
  const arr = loadJson<string[]>(AUTO_INJECTED_KEY, [], (raw) =>
    Array.isArray(raw) ? (raw as string[]) : null,
  )
  return new Set(arr)
}

function saveAutoInjectedIds(ids: Set<string>): void {
  saveJson(AUTO_INJECTED_KEY, [...ids])
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

interface AutoInjectContext {
  readonly prevYearHasPrevYear: boolean
  readonly storeCount: number
  readonly hasDiscountData?: boolean
  readonly isDuckDBReady?: boolean
}

/**
 * 注入候補を純粋に判定する（副作用なし）。
 * localStorage の読み取りは行うが、書き込みは行わない。
 *
 * @returns 注入候補の widget ID 配列（空なら注入不要）
 */
export function resolveAutoInjectCandidates(
  currentIds: string[],
  ctx: AutoInjectContext,
): string[] {
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

  return candidates.map((c) => c.id)
}

/**
 * 注入結果を localStorage に記録する（副作用）。
 * resolveAutoInjectCandidates の結果を受けて effect 内で呼ぶ。
 */
export function commitAutoInjectedIds(candidateIds: string[]): void {
  if (candidateIds.length === 0) return
  const seen = getAutoInjectedIds()
  for (const id of candidateIds) seen.add(id)
  saveAutoInjectedIds(seen)
}

/**
 * データ有無に応じてウィジェットを自動注入する。
 * 初回のみ追加し、ユーザーが削除した場合は再注入しない。
 *
 * @returns 更新後の widgetIds（変更なしなら null）
 */
export function autoInjectDataWidgets(
  currentIds: string[],
  ctx: AutoInjectContext,
): string[] | null {
  const candidateIds = resolveAutoInjectCandidates(currentIds, ctx)
  if (candidateIds.length === 0) return null
  commitAutoInjectedIds(candidateIds)
  return [...currentIds, ...candidateIds]
}
