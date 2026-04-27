/**
 * ウォーターフォール部門別増減データ整合性テスト
 *
 * 不変条件: buildCategoryData の残差は同一データソース (CategoryDailySeries)
 * から計算されるため 0 に近い。
 *
 * Phase 6.5-5b: 入力は `CategoryDailySeries` (dept-grain projection) 経由。
 *
 * @guard D1 要因分解の合計は売上差に完全一致
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildCategoryData } from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.data'
import type { CategoryDailySeries } from '@/application/hooks/categoryDaily/CategoryDailyBundle.types'

function makeSeries(
  depts: readonly { code: string; name: string; sales: number }[],
): CategoryDailySeries {
  return {
    entries: depts.map((d) => ({
      deptCode: d.code,
      deptName: d.name,
      daily: [],
      totals: { sales: d.sales, customers: 0, salesQty: 0 },
    })),
    grandTotals: {
      sales: depts.reduce((s, d) => s + d.sales, 0),
      customers: 0,
      salesQty: 0,
    },
    dayCount: 0,
  }
}

describe('buildCategoryData — データ整合性', () => {
  it('同一データソースから計算される場合、残差は 0 になる', () => {
    const curSeries = makeSeries([
      { code: 'A', name: 'A部門', sales: 100000 },
      { code: 'B', name: 'B部門', sales: 200000 },
      { code: 'C', name: 'C部門', sales: 50000 },
    ])
    const prevSeries = makeSeries([
      { code: 'A', name: 'A部門', sales: 80000 },
      { code: 'B', name: 'B部門', sales: 180000 },
      { code: 'C', name: 'C部門', sales: 60000 },
    ])

    // curSales/prevSales も grandTotals と一致させる
    const curTotal = curSeries.grandTotals.sales
    const prevTotal = prevSeries.grandTotals.sales

    const result = buildCategoryData({
      categoryDailySeries: curSeries,
      categoryDailyPrevSeries: prevSeries,
      hasComparison: true,
      prevSales: prevTotal,
      curSales: curTotal,
      prevLabel: '前年',
      curLabel: '当年',
    })

    // 残差は 0
    expect(result.residual).toBe(0)
    expect(result.residualPct).toBe(0)

    // ウォーターフォールの先頭は前年合計、末尾は当年合計
    expect(result.items[0].value).toBe(prevTotal)
    expect(result.items[result.items.length - 1].value).toBe(curTotal)

    // 部門別差分の合計 = 当年合計 - 前年合計
    const deptDiffs = result.items.filter((it) => !it.isTotal)
    const diffSum = deptDiffs.reduce((s, it) => s + it.value, 0)
    expect(diffSum).toBe(curTotal - prevTotal)
  })

  it('部門が0件の場合は空結果を返す', () => {
    const result = buildCategoryData({
      categoryDailySeries: makeSeries([]),
      categoryDailyPrevSeries: makeSeries([]),
      hasComparison: true,
      prevSales: 100,
      curSales: 200,
      prevLabel: '前年',
      curLabel: '当年',
    })

    expect(result.items).toHaveLength(0)
    expect(result.residual).toBe(0)
  })

  it('prevSales/curSales が series と不一致でも series をアンカーに使う', () => {
    const curSeries = makeSeries([{ code: 'A', name: 'A部門', sales: 100000 }])
    const prevSeries = makeSeries([{ code: 'A', name: 'A部門', sales: 80000 }])

    // 意図的に prevSales/curSales を series と不一致にする（本来はあってはならない）
    const result = buildCategoryData({
      categoryDailySeries: curSeries,
      categoryDailyPrevSeries: prevSeries,
      hasComparison: true,
      prevSales: 99999, // grandTotals(80000) と不一致
      curSales: 99999, // grandTotals(100000) と不一致
      prevLabel: '前年',
      curLabel: '当年',
    })

    // series の grandTotals をアンカーに使うので、残差は 0
    expect(result.residual).toBe(0)
  })
})
