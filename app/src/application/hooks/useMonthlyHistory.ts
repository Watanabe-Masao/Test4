/**
 * 過去月データの集約フック（SeasonalBenchmarkChart 用）
 *
 * IndexedDB に保存された過去月の classifiedSales + StoreDaySummaryCache から
 * MonthlyDataPoint[] を構築し、季節性分析・トレンド分析に使用する。
 *
 * StoreDaySummaryCache が利用可能な月は、売変率・原価率・消耗品率・値入率など
 * 全成分の月次推移を提供できる。キャッシュがない月は classifiedSales のみで
 * 売上データを提供し、成分フィールドは null になる。
 *
 * データフローアーキテクチャ:
 *   Infrastructure(IndexedDB) → Application(このフック) → Presentation(SeasonalBenchmarkChart)
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import type { MonthlyDataPoint } from '@/domain/calculations/trendAnalysis'
import type { DataRepository } from '@/domain/repositories/DataRepository'
import type { StoreDaySummaryIndex } from '@/domain/models'

/**
 * 過去月データを MonthlyDataPoint[] として返すフック。
 *
 * - IndexedDB に保存された月一覧を取得
 * - 各月の classifiedSales を読み込み
 * - 売上・客数・予算等を集約して MonthlyDataPoint に変換
 *
 * @param repo DataRepository インスタンス
 * @param currentYear 当月の年
 * @param currentMonth 当月の月
 */
export function useMonthlyHistory(
  repo: DataRepository | null,
  currentYear: number,
  currentMonth: number,
): readonly MonthlyDataPoint[] {
  const [data, setData] = useState<readonly MonthlyDataPoint[]>([])
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!repo) return

    // 当月が変わったら再読込
    loadedRef.current = false

    let cancelled = false

    async function loadHistory() {
      if (!repo) return
      try {
        const months = await repo.listStoredMonths()
        if (cancelled) return

        const points: MonthlyDataPoint[] = []

        for (const { year, month } of months) {
          if (cancelled) return

          // classifiedSales を読み込んで売上・売変・客数を集約
          const cs = await repo.loadDataSlice<{
            records: readonly {
              storeId: string
              day: number
              sales: number
              discount: number
            }[]
          }>(year, month, 'classifiedSales')

          if (!cs || cs.records.length === 0) continue

          // 店舗×日の合計を算出
          let totalSales = 0
          const storeIds = new Set<string>()

          for (const rec of cs.records) {
            totalSales += rec.sales ?? 0
            storeIds.add(rec.storeId)
          }

          // 予算データの読み込み（あれば）
          const budgetData = await repo.loadDataSlice<ReadonlyMap<string, { monthlyBudget?: number }>>(year, month, 'budget')
          let totalBudget = 0
          if (budgetData && budgetData instanceof Map) {
            for (const [, b] of budgetData) {
              totalBudget += b.monthlyBudget ?? 0
            }
          }

          // StoreDaySummaryCache から成分情報を補完（キャッシュがあれば）
          const componentRates = await loadComponentRates(repo, year, month)

          const point: MonthlyDataPoint = {
            year,
            month,
            totalSales,
            totalCustomers: componentRates?.totalCustomers ?? null,
            grossProfit: componentRates?.grossProfit ?? null,
            grossProfitRate: componentRates?.grossProfitRate ?? null,
            budget: totalBudget > 0 ? totalBudget : null,
            budgetAchievement: totalBudget > 0 ? totalSales / totalBudget : null,
            storeCount: storeIds.size,
            discountRate: componentRates?.discountRate ?? null,
            costRate: componentRates?.costRate ?? null,
            consumableRate: componentRates?.consumableRate ?? null,
            averageMarkupRate: componentRates?.averageMarkupRate ?? null,
          }

          points.push(point)
        }

        if (!cancelled) {
          // 時系列順にソート
          points.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
          setData(points)
          loadedRef.current = true
        }
      } catch {
        // IndexedDB エラーは静かに無視（チャートは「データなし」表示）
      }
    }

    loadHistory()
    return () => { cancelled = true }
  }, [repo, currentYear, currentMonth])

  return data
}

/**
 * 現在の StoreResult を MonthlyDataPoint に変換するヘルパー。
 * 過去月データに当月を追加して最新の季節性分析に含めるために使用。
 */
export function currentResultToMonthlyPoint(
  year: number,
  month: number,
  result: {
    readonly totalSales: number
    readonly totalCustomers: number
    readonly invMethodGrossProfit: number | null
    readonly invMethodGrossProfitRate: number | null
    readonly estMethodMargin: number
    readonly estMethodMarginRate: number
    readonly budget: number
    readonly budgetAchievementRate: number
    readonly discountRate: number
    readonly inventoryCost: number
    readonly deliverySalesCost: number
    readonly grossSales: number
    readonly consumableRate: number
    readonly averageMarkupRate: number
  },
  storeCount: number,
): MonthlyDataPoint {
  const costRate = result.grossSales > 0
    ? (result.inventoryCost + result.deliverySalesCost) / result.grossSales
    : null
  return {
    year,
    month,
    totalSales: result.totalSales,
    totalCustomers: result.totalCustomers,
    grossProfit: result.invMethodGrossProfit ?? result.estMethodMargin,
    grossProfitRate: result.invMethodGrossProfitRate ?? result.estMethodMarginRate,
    budget: result.budget > 0 ? result.budget : null,
    budgetAchievement: result.budgetAchievementRate,
    storeCount,
    discountRate: result.discountRate,
    costRate,
    consumableRate: result.consumableRate,
    averageMarkupRate: result.averageMarkupRate,
  }
}

/**
 * StoreDaySummaryCache から成分情報（売変率、原価率、消耗品率、値入率、客数、粗利）を算出。
 * キャッシュがない場合は null を返す。
 */
async function loadComponentRates(
  repo: DataRepository,
  year: number,
  month: number,
): Promise<{
  discountRate: number
  costRate: number
  consumableRate: number
  averageMarkupRate: number
  totalCustomers: number
  grossProfit: number
  grossProfitRate: number
} | null> {
  try {
    const cache = await repo.loadSummaryCache(year, month)
    if (!cache?.summaries) return null
    return aggregateSummaryRates(cache.summaries)
  } catch {
    return null
  }
}

/**
 * StoreDaySummaryIndex の全店舗・全日を集約して成分率を算出する。
 */
function aggregateSummaryRates(summaries: StoreDaySummaryIndex): {
  discountRate: number
  costRate: number
  consumableRate: number
  averageMarkupRate: number
  totalCustomers: number
  grossProfit: number
  grossProfitRate: number
} | null {
  let totalSales = 0
  let totalGrossSales = 0
  let totalDiscount = 0
  let totalPurchaseCost = 0
  let totalPurchasePrice = 0
  let totalFlowersCost = 0
  let totalDirectProduceCost = 0
  let totalConsumable = 0
  let totalCustomers = 0

  for (const days of Object.values(summaries)) {
    for (const day of Object.values(days)) {
      totalSales += day.sales
      totalGrossSales += day.grossSales
      totalDiscount += day.discountAmount
      totalPurchaseCost += day.purchaseCost
      totalPurchasePrice += day.purchasePrice
      totalFlowersCost += day.flowersCost
      totalDirectProduceCost += day.directProduceCost
      totalConsumable += day.consumableCost
      totalCustomers += day.customers
    }
  }

  if (totalSales === 0) return null

  const inventoryCost = totalPurchaseCost - totalFlowersCost - totalDirectProduceCost
  const deliverySalesCost = totalFlowersCost + totalDirectProduceCost
  const allCost = inventoryCost + deliverySalesCost
  const allPrice = totalPurchasePrice

  const grossProfit = totalSales - allCost
  const grossProfitRate = totalSales > 0 ? grossProfit / totalSales : 0

  return {
    discountRate: totalSales > 0 ? totalDiscount / totalSales : 0,
    costRate: totalGrossSales > 0 ? allCost / totalGrossSales : 0,
    consumableRate: totalSales > 0 ? totalConsumable / totalSales : 0,
    averageMarkupRate: allPrice > 0 ? (allPrice - totalPurchaseCost) / allPrice : 0,
    totalCustomers,
    grossProfit,
    grossProfitRate,
  }
}

/**
 * 過去月 + 当月を結合した MonthlyDataPoint[] を返すフック。
 */
export function useMonthlyDataPoints(
  historicalData: readonly MonthlyDataPoint[],
  currentYear: number,
  currentMonth: number,
  currentPoint: MonthlyDataPoint | null,
): readonly MonthlyDataPoint[] {
  return useMemo(() => {
    // 当月を除外（IndexedDB にも当月データがある場合の重複防止）
    const filtered = historicalData.filter(
      (p) => !(p.year === currentYear && p.month === currentMonth),
    )
    if (currentPoint) {
      return [...filtered, currentPoint]
    }
    return filtered
  }, [historicalData, currentYear, currentMonth, currentPoint])
}
