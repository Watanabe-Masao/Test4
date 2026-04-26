/**
 * RegressionInsightChart — pure data builder
 *
 * useMemo body の pure 計算抽出 (ADR-D-003 PR4)。
 * 日別売上から回帰直線・WMA・残差・信頼区間・統計指標・期末予測を一括算出する。
 *
 * @responsibility R:utility
 */
import {
  linearRegression,
  calculateWMA,
  calculateMonthEndProjection,
  calculateStdDev,
  type LinearRegressionResult,
  type MonthEndProjection,
} from '@/application/hooks/useStatistics'
import { safeDivide } from '@/domain/calculations/utils'
import { toPct } from '@/presentation/components/charts/chartTheme'
import type { StoreResult } from '@/domain/models/storeTypes'

export interface RegressionChartPoint {
  readonly day: number
  readonly sales: number
  readonly regression: number
  readonly wma: number | null
  readonly residual: number
  readonly ciUpper: number
  readonly ciLower: number
}

export interface RegressionStats {
  readonly rSquaredPct: string
  readonly dailyTrend: number
  readonly stdDev: number
  readonly avgSales: number
}

export interface RegressionInsight {
  readonly chartData: readonly RegressionChartPoint[]
  readonly reg: LinearRegressionResult
  readonly projection: MonthEndProjection
  readonly stats: RegressionStats
}

export function buildRegressionInsight(
  result: StoreResult,
  year: number,
  month: number,
): RegressionInsight {
  const dailySalesMap = new Map<number, number>()
  const salesValues: number[] = []
  for (const [day, rec] of result.daily) {
    if (rec.sales > 0) {
      dailySalesMap.set(day, rec.sales)
      salesValues.push(rec.sales)
    }
  }
  const reg = linearRegression(dailySalesMap)
  const wma = calculateWMA(dailySalesMap)
  const projection = calculateMonthEndProjection(year, month, dailySalesMap)

  const wmaMap = new Map(wma.map((w) => [w.day, w.wma]))
  const { stdDev } = salesValues.length > 0 ? calculateStdDev(salesValues) : { stdDev: 0 }
  const z95 = 1.96
  const se = safeDivide(stdDev, Math.sqrt(salesValues.length), stdDev)

  const data: RegressionChartPoint[] = []
  for (const [day, rec] of result.daily) {
    if (rec.sales <= 0) continue
    const regVal = reg.slope * day + reg.intercept
    data.push({
      day,
      sales: rec.sales,
      regression: regVal,
      wma: wmaMap.get(day) ?? null,
      residual: rec.sales - regVal,
      ciUpper: regVal + z95 * se,
      ciLower: Math.max(0, regVal - z95 * se),
    })
  }
  data.sort((a, b) => a.day - b.day)

  return {
    chartData: data,
    reg,
    projection,
    stats: {
      rSquaredPct: toPct(reg.rSquared),
      dailyTrend: reg.slope,
      stdDev,
      avgSales:
        salesValues.length > 0 ? salesValues.reduce((s, v) => s + v, 0) / salesValues.length : 0,
    },
  }
}
