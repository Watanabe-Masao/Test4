/**
 * GrossProfitAmountChart — 純粋ロジック層
 *
 * 当期 daily + 前年 daily + 前年原価 map を受け取り、日別の累計粗利 /
 * 粗利率 / 前年同期比率 を構築する。React 非依存。副作用なし。
 *
 * unify-period-analysis Phase 5 閉じ込み: `GrossProfitAmountChart.tsx` 内に
 * inline 定義されていた `buildGpData` を本ファイルに抽出した。返り値は
 * `ChartRenderModel<GpPoint>` 共通契約に揃えている。
 *
 * @responsibility R:calculation
 */
import type { DailyRecord } from '@/domain/models/record'
import { calculateGrossProfitRate } from '@/domain/calculations/utils'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import type { ChartRenderModel } from './chartRenderModel'

/**
 * 1 日分の累計粗利 point.
 */
export interface GpPoint {
  readonly day: number
  /** 当日までの累計粗利 (売上 − 原価) */
  readonly grossProfit: number
  /** 当日までの累計粗利率 */
  readonly rate: number
  /** 前年同日までの累計粗利率 (前年データなしなら null) */
  readonly prevRate: number | null
}

/**
 * GrossProfitAmountChart の ChartRenderModel.
 *
 * `flags.hasComparison` は前年 daily + 前年原価 map が揃っているか。
 */
export type GrossProfitAmountRenderModel = ChartRenderModel<GpPoint>

/**
 * 当期 daily + 前年 daily + 前年原価 map から日別粗利データを構築する。
 */
export function buildGpData(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  year: number,
  month: number,
  prevYearDaily?: ReadonlyMap<string, { sales: number }>,
  prevYearCostMap?: ReadonlyMap<number, number>,
): GrossProfitAmountRenderModel {
  let cumSales = 0
  let cumCost = 0
  let prevCumSales = 0
  let prevCumCost = 0
  const hasPrevGp = !!prevYearDaily && !!prevYearCostMap
  const points: GpPoint[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      cumSales += rec.sales
      cumCost += rec.totalCost
    }
    const grossProfit = cumSales - cumCost
    const rate = calculateGrossProfitRate(grossProfit, cumSales)

    let prevRate: number | null = null
    if (hasPrevGp) {
      prevCumSales += prevYearDaily!.get(toDateKeyFromParts(year, month, d))?.sales ?? 0
      prevCumCost += prevYearCostMap!.get(d) ?? 0
      prevRate =
        prevCumSales > 0 ? calculateGrossProfitRate(prevCumSales - prevCumCost, prevCumSales) : null
    }
    points.push({ day: d, grossProfit, rate, prevRate })
  }

  return {
    points,
    flags: { hasComparison: hasPrevGp },
  }
}
