/**
 * 自由期間分析の Explanation ビルダー
 *
 * FreePeriodSummary / FreePeriodBudgetReadModel / FreePeriodDeptKPIReadModel から
 * L1（一言）+ L2（式と入力）の Explanation を生成する。
 *
 * 月次 Explanation（ExplanationService）とは別系統。
 * FreePeriodReadModel の値をそのまま使い、再計算しない。
 *
 * @see references/01-foundation/free-period-analysis-definition.md
 * @see references/01-foundation/free-period-budget-kpi-contract.md
 *
 * @responsibility R:unclassified
 */
import type { Explanation, MetricId } from '@/domain/models/analysis'
import type { FreePeriodSummary } from '@/application/readModels/freePeriod'
import { inp } from './explanationHelpers'

export type FreePeriodExplanations = ReadonlyMap<MetricId, Explanation>

/**
 * FreePeriodSummary から Explanation を生成する。
 *
 * 対象 MetricId:
 * - freePeriodTotalSales: 期間売上合計
 * - freePeriodBudgetAchievement: 予算達成率（日割り按分済み）
 * - freePeriodDiscountRate: 期間売変率
 * - freePeriodTransactionValue: 客単価
 */
export function generateFreePeriodExplanations(
  summary: FreePeriodSummary,
  dateFrom: string,
  dateTo: string,
): FreePeriodExplanations {
  const map = new Map<MetricId, Explanation>()

  const scope = { storeId: '*', year: 0, month: 0 }

  // ── 期間売上合計 ──
  map.set('freePeriodTotalSales', {
    metric: 'freePeriodTotalSales',
    title: '自由期間売上合計',
    formula: `${dateFrom}〜${dateTo} の売上合計`,
    value: summary.totalSales,
    unit: 'yen',
    scope,
    inputs: [
      inp('対象日数', summary.dayCount, 'count'),
      inp('店舗数', summary.storeCount, 'count'),
      inp('日平均売上', summary.averageDailySales, 'yen'),
    ],
    evidenceRefs: [],
  })

  // ── 予算達成率（日割り按分） ──
  if (summary.proratedBudget != null && summary.budgetAchievementRate != null) {
    map.set('freePeriodBudgetAchievement', {
      metric: 'freePeriodBudgetAchievement',
      title: '自由期間予算達成率',
      formula: '予算達成率 = 期間売上 ÷ 日割り予算',
      value: summary.budgetAchievementRate,
      unit: 'rate',
      scope,
      inputs: [
        inp('期間売上', summary.totalSales, 'yen', 'freePeriodTotalSales'),
        inp('日割り予算', summary.proratedBudget, 'yen'),
        inp('対象日数', summary.dayCount, 'count'),
      ],
      evidenceRefs: [],
    })
  }

  // ── 売変率 ──
  map.set('freePeriodDiscountRate', {
    metric: 'freePeriodDiscountRate',
    title: '自由期間売変率',
    formula: '売変率 = 売変額 ÷ (売上 + 売変額)',
    value: summary.discountRate,
    unit: 'rate',
    scope,
    inputs: [
      inp('売変額', summary.totalDiscount, 'yen'),
      inp('売上', summary.totalSales, 'yen', 'freePeriodTotalSales'),
    ],
    evidenceRefs: [],
  })

  // ── 客単価 ──
  map.set('freePeriodTransactionValue', {
    metric: 'freePeriodTransactionValue',
    title: '自由期間客単価',
    formula: '客単価 = 売上合計 ÷ 客数合計',
    value: summary.transactionValue,
    unit: 'yen',
    scope,
    inputs: [
      inp('売上合計', summary.totalSales, 'yen', 'freePeriodTotalSales'),
      inp('客数合計', summary.totalCustomers, 'count'),
    ],
    evidenceRefs: [],
  })

  return map
}

/**
 * 部門KPI の salesAchievement に対する Explanation を生成する。
 *
 * @param deptCode 部門コード
 * @param salesActual 実績売上
 * @param salesBudget 予算売上
 * @param achievement 達成率（salesActual / salesBudget）
 */
export function generateDeptKPIExplanation(
  deptCode: string,
  deptName: string,
  salesActual: number,
  salesBudget: number,
  achievement: number | null,
): Explanation {
  return {
    metric: 'freePeriodDeptSalesAchievement',
    title: `${deptName}（${deptCode}）売上達成率`,
    formula: '部門売上達成率 = 部門実績 ÷ 部門予算（売上加重平均）',
    value: achievement ?? 0,
    unit: 'rate',
    scope: { storeId: '*', year: 0, month: 0 },
    inputs: [inp('部門実績売上', salesActual, 'yen'), inp('部門予算売上', salesBudget, 'yen')],
    evidenceRefs: [],
  }
}
