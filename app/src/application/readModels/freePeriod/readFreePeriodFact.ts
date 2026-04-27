/**
 * readFreePeriodFact — 自由期間分析の唯一の read 関数
 *
 * DuckDB から日別×店舗の売上/仕入/客数/売変を取得し、
 * JS で期間サマリーを導出して FreePeriodReadModel を返す。
 *
 * @see references/01-principles/free-period-analysis-definition.md (予定)
 *
 * @responsibility R:unclassified
 */
import {
  FreePeriodReadModel,
  FreePeriodSummary,
  type FreePeriodReadModel as FreePeriodReadModelType,
  type FreePeriodDailyRow as FreePeriodDailyRowType,
  type FreePeriodSummary as FreePeriodSummaryType,
} from './FreePeriodTypes'

// ── サマリー計算（純粋関数） ──

export function computeFreePeriodSummary(
  rows: readonly FreePeriodDailyRowType[],
  budgetInfo?: { proratedBudget: number } | null,
): FreePeriodSummaryType {
  if (rows.length === 0) {
    return {
      storeCount: 0,
      dayCount: 0,
      totalSales: 0,
      totalCustomers: 0,
      totalPurchaseCost: 0,
      totalDiscount: 0,
      averageDailySales: 0,
      transactionValue: 0,
      discountRate: 0,
      proratedBudget: null,
      budgetAchievementRate: null,
    }
  }

  const storeIds = new Set<string>()
  const days = new Set<string>()
  let totalSales = 0
  let totalCustomers = 0
  let totalPurchaseCost = 0
  let totalDiscount = 0

  for (const row of rows) {
    storeIds.add(row.storeId)
    days.add(row.dateKey)
    totalSales += row.sales
    totalCustomers += row.customers
    totalPurchaseCost += row.purchaseCost
    totalDiscount += row.discount
  }

  const dayCount = days.size
  const averageDailySales = dayCount > 0 ? totalSales / dayCount : 0
  const transactionValue = totalCustomers > 0 ? totalSales / totalCustomers : 0
  const discountRate =
    totalSales + totalDiscount > 0 ? totalDiscount / (totalSales + totalDiscount) : 0

  const proratedBudget = budgetInfo?.proratedBudget ?? null
  const budgetAchievementRate =
    proratedBudget != null && proratedBudget > 0 ? totalSales / proratedBudget : null

  return FreePeriodSummary.parse({
    storeCount: storeIds.size,
    dayCount,
    totalSales,
    totalCustomers,
    totalPurchaseCost,
    totalDiscount,
    averageDailySales,
    transactionValue,
    discountRate,
    proratedBudget,
    budgetAchievementRate,
  })
}

/**
 * 月予算を対象期間に日割り按分する。
 *
 * 粒度契約:
 * - budget.daily が存在 → 対象期間内の日別予算を合計
 * - budget.daily が空 → budget.total / daysInMonth × 対象日数
 * - 月跨ぎ → 各月独立に按分し合算
 */
export function prorateBudget(
  monthlyBudgets: ReadonlyMap<string, { total: number; daily?: ReadonlyMap<number, number> }>,
  dateKeys: ReadonlySet<string>,
): number {
  let total = 0

  // dateKey → year-month でグループ化
  const daysByMonth = new Map<string, number[]>()
  for (const dk of dateKeys) {
    const [y, m, d] = dk.split('-').map(Number)
    const mk = `${y}-${m}`
    const days = daysByMonth.get(mk)
    if (days) days.push(d)
    else daysByMonth.set(mk, [d])
  }

  for (const [mk, days] of daysByMonth) {
    const budget = monthlyBudgets.get(mk)
    if (!budget) continue

    if (budget.daily && budget.daily.size > 0) {
      // 日別予算があれば対象日のみ合算
      for (const d of days) {
        total += budget.daily.get(d) ?? 0
      }
    } else if (budget.total > 0) {
      // 月予算を日割り
      const [y, m] = mk.split('-').map(Number)
      const daysInMonth = new Date(y, m, 0).getDate()
      total += (budget.total / daysInMonth) * days.length
    }
  }

  return total
}

// ── 公開 API ──

/**
 * 自由期間分析の pure builder。
 *
 * raw query 結果を受け取り、サマリー計算 + Zod parse して ReadModel を返す。
 * infra query への依存はない（handler 側で取得済みのデータを渡す）。
 */
export function buildFreePeriodReadModel(
  currentRows: readonly FreePeriodDailyRowType[],
  comparisonRows: readonly FreePeriodDailyRowType[],
): FreePeriodReadModelType {
  const currentSummary = computeFreePeriodSummary(currentRows)
  const comparisonSummary =
    comparisonRows.length > 0 ? computeFreePeriodSummary(comparisonRows) : null

  return FreePeriodReadModel.parse({
    currentRows,
    comparisonRows,
    currentSummary,
    comparisonSummary,
    meta: {
      usedFallback: false,
    },
  })
}
