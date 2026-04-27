/**
 * IntegratedTimeline — pure data builder
 *
 * useMemo body の pure 計算抽出 (ADR-D-003 PR4)。
 * 売上 / 仕入 / 粗利 / 売変の連動分析に必要な系列・正規化・相関・乖離ゾーンを
 * 一括で算出する。React hooks や I/O を含まない pure 関数。
 *
 * @responsibility R:unclassified
 */
import {
  normalizeMinMax,
  pearsonCorrelation,
  detectDivergence,
  movingAverage,
} from '@/application/hooks/useStatistics'
import type { StoreResult } from '@/domain/models/storeTypes'

export interface IntegratedTimelinePoint {
  readonly day: number
  readonly sales: number
  readonly cost: number
  readonly grossProfit: number
  readonly discount: number
  readonly normSales: number
  readonly normCost: number
  readonly normGrossProfit: number
  readonly normDiscount: number
  readonly maSales: number
  readonly maCost: number
}

export interface IntegratedTimelineSeries {
  readonly chartData: readonly IntegratedTimelinePoint[]
  readonly correlations: readonly { readonly pair: string; readonly r: number }[]
  readonly divergentRanges: readonly { readonly start: number; readonly end: number }[]
}

export function buildIntegratedTimelineSeries(
  result: StoreResult,
  daysInMonth: number,
): IntegratedTimelineSeries {
  const salesArr: number[] = []
  const costArr: number[] = []
  const gpArr: number[] = []
  const discountArr: number[] = []
  const days: number[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = result.daily.get(d)
    days.push(d)
    const sales = rec?.sales ?? 0
    const cost = rec ? rec.purchase.cost + rec.deliverySales.cost : 0
    const discount = rec?.discountAmount ?? 0
    salesArr.push(sales)
    costArr.push(cost)
    gpArr.push(sales - cost)
    discountArr.push(discount)
  }

  const normSales = normalizeMinMax(salesArr)
  const normCost = normalizeMinMax(costArr)
  const normGP = normalizeMinMax(gpArr)
  const normDiscount = normalizeMinMax(discountArr)
  const maSales = movingAverage(salesArr, 7)
  const maCost = movingAverage(costArr, 7)

  const chartData: IntegratedTimelinePoint[] = days.map((d, i) => ({
    day: d,
    sales: salesArr[i],
    cost: costArr[i],
    grossProfit: gpArr[i],
    discount: discountArr[i],
    normSales: normSales.values[i],
    normCost: normCost.values[i],
    normGrossProfit: normGP.values[i],
    normDiscount: normDiscount.values[i],
    maSales: maSales[i],
    maCost: maCost[i],
  }))

  const series = [
    { name: '売上', values: salesArr },
    { name: '仕入', values: costArr },
    { name: '粗利', values: gpArr },
    { name: '売変', values: discountArr },
  ]
  const correlations: { pair: string; r: number }[] = []
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const { r } = pearsonCorrelation(series[i].values, series[j].values)
      correlations.push({ pair: `${series[i].name}×${series[j].name}`, r })
    }
  }

  const divPts = detectDivergence(salesArr, costArr, 30)
  const divergentRanges: { start: number; end: number }[] = []
  let rangeStart: number | null = null
  for (const pt of divPts) {
    if (pt.isSignificant) {
      if (rangeStart == null) rangeStart = pt.index + 1
    } else if (rangeStart != null) {
      divergentRanges.push({ start: rangeStart, end: pt.index })
      rangeStart = null
    }
  }
  if (rangeStart != null) divergentRanges.push({ start: rangeStart, end: divPts.length })

  return { chartData, correlations, divergentRanges }
}
