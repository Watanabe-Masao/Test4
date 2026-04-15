/**
 * DiscountTrendChart — 純粋ロジック層
 *
 * 当期 daily + 前年 daily を受け取り、売変内訳分析用の日別 point 配列
 * (積上 + 累計売変率) を構築する。React 非依存。副作用なし。
 *
 * unify-period-analysis Phase 5 閉じ込み: `DiscountTrendChart.tsx` 内に
 * inline 定義されていた `buildDiscountData` を本ファイルに抽出した。
 * 返り値は `ChartRenderModel<DiscountPoint>` 共通契約に揃えている。
 *
 * @responsibility R:calculation
 */
import type { DailyRecord } from '@/domain/models/record'
import { DISCOUNT_TYPES } from '@/domain/models/record'
import { calculateShare } from '@/domain/calculations/utils'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import type { ChartRenderModel } from './chartRenderModel'

/**
 * 1 日分の売変内訳データ point.
 *
 * `byType` / `prevByType` / `cumRateByType` / `prevCumRateByType` は
 * `DISCOUNT_TYPES[i].type` をキーとする record。chart は DISCOUNT_TYPES を
 * イテレートして参照する。
 */
export interface DiscountPoint {
  readonly day: number
  /** 当日の売変総額 */
  readonly discount: number
  /** 当日までの累計売変率 (全種別合算) */
  readonly cumRate: number
  /** 前年同日までの累計売変率 */
  readonly prevCumRate: number | null
  /** 当日に売上実績が存在するか */
  readonly hasSales: boolean
  /** 種別別の当日売変額 */
  readonly byType: Readonly<Record<string, number>>
  /** 種別別の累計売変率 */
  readonly cumRateByType: Readonly<Record<string, number | null>>
  /** 前年同日の種別別売変額 (前年データがある場合のみ) */
  readonly prevByType?: Readonly<Record<string, number>>
  /** 前年同日の種別別累計売変率 (前年データがある場合のみ) */
  readonly prevCumRateByType?: Readonly<Record<string, number | null>>
}

/**
 * DiscountTrendChart の ChartRenderModel.
 *
 * `flags.hasComparison` は前年 daily が提供されているか。
 */
export type DiscountTrendRenderModel = ChartRenderModel<DiscountPoint>

/**
 * 当期 daily + 前年 daily から日別売変内訳データを構築する。
 *
 * @param daily 当期日別レコード map
 * @param daysInMonth 対象月の日数 (月末までループ)
 * @param year 対象年 (前年 dateKey 算出に使う)
 * @param month 対象月 (同上)
 * @param prevYearDaily 前年同月の日別 map (dateKey → prev data)
 */
export function buildDiscountData(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  year: number,
  month: number,
  prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; discountEntries?: Record<string, number> }
  >,
): DiscountTrendRenderModel {
  let cumDiscount = 0
  let cumGrossSales = 0
  let prevCumDiscount = 0
  let prevCumGrossSales = 0

  const typeCum: Record<string, number> = {}
  const prevTypeCum: Record<string, number> = {}
  for (const dt of DISCOUNT_TYPES) {
    typeCum[dt.type] = 0
    prevTypeCum[dt.type] = 0
  }

  const points: DiscountPoint[] = []
  const hasPrev = !!prevYearDaily

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    cumDiscount += rec?.discountAbsolute ?? 0
    cumGrossSales += rec?.grossSales ?? 0
    const cumRate = calculateShare(cumDiscount, cumGrossSales)

    const prevEntry = prevYearDaily?.get(toDateKeyFromParts(year, month, d))
    prevCumDiscount += prevEntry?.discount ?? 0
    prevCumGrossSales += prevEntry?.sales ?? 0
    const prevCumRate =
      prevCumGrossSales > 0 ? calculateShare(prevCumDiscount, prevCumGrossSales) : null

    const byType: Record<string, number> = {}
    const cumRateByType: Record<string, number | null> = {}
    const prevByType: Record<string, number> = {}
    const prevCumRateByType: Record<string, number | null> = {}

    for (const dt of DISCOUNT_TYPES) {
      const curAmt = rec?.discountEntries?.find((e) => e.type === dt.type)?.amount ?? 0
      byType[dt.type] = curAmt
      typeCum[dt.type] += curAmt
      cumRateByType[dt.type] =
        cumGrossSales > 0 ? calculateShare(typeCum[dt.type], cumGrossSales) : null

      if (hasPrev && prevEntry?.discountEntries) {
        const prevAmt = prevEntry.discountEntries[dt.type] ?? 0
        prevByType[dt.type] = prevAmt
        prevTypeCum[dt.type] += prevAmt
        prevCumRateByType[dt.type] =
          prevCumGrossSales > 0 ? calculateShare(prevTypeCum[dt.type], prevCumGrossSales) : null
      }
    }

    points.push({
      day: d,
      discount: rec?.discountAbsolute ?? 0,
      cumRate,
      prevCumRate,
      hasSales: rec ? rec.sales > 0 : false,
      byType,
      cumRateByType,
      ...(hasPrev ? { prevByType, prevCumRateByType } : {}),
    })
  }

  return {
    points,
    flags: { hasComparison: hasPrev },
  }
}
