/**
 * 過去月データの集約フック（SeasonalBenchmarkChart 用）
 *
 * IndexedDB に保存された過去月の classifiedSales + StoreDaySummaryCache から
 * MonthlyDataPoint[] を構築し、季節性分析・トレンド分析に使用する。
 *
 * 純粋な変換ロジックは monthlyHistoryLogic.ts に分離。
 *
 * @responsibility R:unclassified
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import type { MonthlyDataPoint } from '@/application/services/forecastBridge'
import type { DataRepository } from '@/domain/repositories/DataRepository'
import { aggregateSummaryRates } from './monthlyHistoryLogic'

// 後方互換 re-export
export { currentResultToMonthlyPoint } from './monthlyHistoryLogic'

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
          const budgetData = await repo.loadDataSlice<
            ReadonlyMap<string, { monthlyBudget?: number }>
          >(year, month, 'budget')
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
            costInclusionRate: componentRates?.costInclusionRate ?? null,
            averageMarkupRate: componentRates?.averageMarkupRate ?? null,
          }

          points.push(point)
        }

        if (!cancelled) {
          // 時系列順にソート
          points.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month))
          setData(points)
          loadedRef.current = true
        }
      } catch (err) {
        // IndexedDB エラーは静かに無視（チャートは「データなし」表示）
        console.warn('[useMonthlyHistory]:', err)
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [repo, currentYear, currentMonth])

  return data
}

/**
 * StoreDaySummaryCache から成分情報（売変率、原価率、原価算入率、値入率、客数、粗利）を算出。
 * キャッシュがない場合は null を返す。
 */
async function loadComponentRates(
  repo: DataRepository,
  year: number,
  month: number,
): Promise<{
  discountRate: number
  costRate: number
  costInclusionRate: number
  averageMarkupRate: number
  totalCustomers: number
  grossProfit: number
  grossProfitRate: number
} | null> {
  try {
    const cache = await repo.loadSummaryCache(year, month)
    if (!cache?.summaries) return null
    return aggregateSummaryRates(cache.summaries)
  } catch (err) {
    console.warn('[useMonthlyHistory]:', err)
    return null
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
