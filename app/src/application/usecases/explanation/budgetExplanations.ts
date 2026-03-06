/**
 * budgetExplanations
 *
 * 予算系・粗利予算系の指標 Explanation を Map に登録する。
 * ExplanationService から分離し、ファイルサイズを抑える。
 */
import type { StoreResult, MetricId, Explanation } from '@/domain/models'
import { safeDivide } from '@/domain/calculations/utils'
import { inp } from './explanationHelpers'

/**
 * 予算系・粗利予算系の指標を map に登録する
 */
export function registerBudgetExplanations(
  map: Map<MetricId, Explanation>,
  result: StoreResult,
  scope: Explanation['scope'],
  storeId: string,
): void {
  map.set('budget', {
    metric: 'budget',
    title: '月間予算',
    formula: '予算 = 予算データ or デフォルト予算',
    value: result.budget,
    unit: 'yen',
    scope,
    inputs: [inp('月間予算', result.budget, 'yen')],
    evidenceRefs: [{ kind: 'aggregate', dataType: 'budget', storeId }],
  })

  map.set('budgetAchievementRate', {
    metric: 'budgetAchievementRate',
    title: '予算達成率',
    formula: '予算達成率 = 総売上 ÷ 月間予算',
    value: result.budgetAchievementRate,
    unit: 'rate',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('月間予算', result.budget, 'yen', 'budget'),
    ],
    evidenceRefs: [],
  })

  map.set('budgetProgressRate', {
    metric: 'budgetProgressRate',
    title: '予算消化率',
    formula: '予算消化率 = 総売上 ÷ 経過日予算累計',
    value: result.budgetProgressRate,
    unit: 'rate',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('経過日数', result.elapsedDays, 'count'),
    ],
    evidenceRefs: [],
  })

  map.set('projectedSales', {
    metric: 'projectedSales',
    title: '月末予測売上',
    formula: '月末予測 = 実績 + 日平均売上 × 残日数',
    value: result.projectedSales,
    unit: 'yen',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('日平均売上', result.averageDailySales, 'yen'),
      inp('経過日数', result.elapsedDays, 'count'),
    ],
    evidenceRefs: [],
  })

  map.set('remainingBudget', {
    metric: 'remainingBudget',
    title: '残余予算',
    formula: '残余予算 = 月間予算 - 総売上',
    value: result.remainingBudget,
    unit: 'yen',
    scope,
    inputs: [
      inp('月間予算', result.budget, 'yen', 'budget'),
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
    ],
    evidenceRefs: [],
  })

  map.set('budgetElapsedRate', {
    metric: 'budgetElapsedRate',
    title: '経過予算率',
    formula: '経過予算率 = 経過予算累計 ÷ 月間予算',
    value: result.budgetElapsedRate,
    unit: 'rate',
    scope,
    inputs: [
      inp('経過日数', result.elapsedDays, 'count'),
      inp('月間予算', result.budget, 'yen', 'budget'),
    ],
    evidenceRefs: [],
  })

  map.set('budgetProgressGap', {
    metric: 'budgetProgressGap',
    title: '予算進捗ギャップ',
    formula: '進捗ギャップ = 消化率 − 経過率（正 = 前倒し、負 = 遅れ）',
    value: result.budgetProgressGap,
    unit: 'rate',
    scope,
    inputs: [
      inp('予算消化率', result.budgetProgressRate, 'rate', 'budgetProgressRate'),
      inp('経過予算率', result.budgetElapsedRate, 'rate', 'budgetElapsedRate'),
    ],
    evidenceRefs: [],
  })

  map.set('budgetVariance', {
    metric: 'budgetVariance',
    title: '予算差異',
    formula: '予算差異 = 累計実績 − 経過予算累計（正 = 予算超過ペース）',
    value: result.budgetVariance,
    unit: 'yen',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('経過日数', result.elapsedDays, 'count'),
    ],
    evidenceRefs: [],
  })

  map.set('requiredDailySales', {
    metric: 'requiredDailySales',
    title: '必要日次売上',
    formula: '必要日次売上 = 残余予算 ÷ 残日数',
    value: result.requiredDailySales,
    unit: 'yen',
    scope,
    inputs: [
      inp('残余予算', result.remainingBudget, 'yen', 'remainingBudget'),
      inp('経過日数', result.elapsedDays, 'count'),
    ],
    evidenceRefs: [],
  })

  map.set('averageDailySales', {
    metric: 'averageDailySales',
    title: '日平均売上',
    formula: '日平均売上 = 総売上 ÷ 営業日数',
    value: result.averageDailySales,
    unit: 'yen',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('営業日数', result.salesDays, 'count'),
    ],
    evidenceRefs: [],
  })

  map.set('projectedAchievement', {
    metric: 'projectedAchievement',
    title: '着地予測達成率',
    formula: '着地予測達成率 = 月末予測売上 ÷ 月間予算',
    value: result.projectedAchievement,
    unit: 'rate',
    scope,
    inputs: [
      inp('月末予測売上', result.projectedSales, 'yen', 'projectedSales'),
      inp('月間予算', result.budget, 'yen', 'budget'),
    ],
    evidenceRefs: [],
  })

  // ─── 粗利予算系 ────────────────────────────────────────

  map.set('grossProfitBudget', {
    metric: 'grossProfitBudget',
    title: '粗利予算',
    formula: '粗利予算 = 設定値',
    value: result.grossProfitBudget,
    unit: 'yen',
    scope,
    inputs: [inp('粗利予算', result.grossProfitBudget, 'yen')],
    evidenceRefs: [{ kind: 'aggregate', dataType: 'budget', storeId }],
  })

  map.set('grossProfitRateBudget', {
    metric: 'grossProfitRateBudget',
    title: '粗利率予算',
    formula: '粗利率予算 = 粗利予算 ÷ 売上予算',
    value: result.grossProfitRateBudget,
    unit: 'rate',
    scope,
    inputs: [
      inp('粗利予算', result.grossProfitBudget, 'yen', 'grossProfitBudget'),
      inp('売上予算', result.budget, 'yen', 'budget'),
    ],
    evidenceRefs: [],
  })

  if (result.grossProfitBudget > 0) {
    const gpActual = result.invMethodGrossProfit ?? result.estMethodMargin
    const gpBudgetAchievement = safeDivide(gpActual, result.grossProfitBudget, 0)

    map.set('grossProfitBudgetAchievement', {
      metric: 'grossProfitBudgetAchievement',
      title: '粗利予算達成率',
      formula: '粗利予算達成率 = 粗利実績 ÷ 粗利予算',
      value: gpBudgetAchievement,
      unit: 'rate',
      scope,
      inputs: [
        inp('粗利実績', gpActual, 'yen'),
        inp('粗利予算', result.grossProfitBudget, 'yen', 'grossProfitBudget'),
      ],
      evidenceRefs: [],
    })
  }
}
