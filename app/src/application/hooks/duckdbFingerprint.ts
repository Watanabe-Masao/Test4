/**
 * DuckDB データ変更検知のフィンガープリント（純粋関数）
 *
 * MonthlyData のレコード数ベースで軽量に変更を判定する。
 * storedMonthsKey で過去月の増減も検知する。
 * @responsibility R:unclassified
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'

export function computeFingerprint(
  data: MonthlyData | null,
  year: number,
  month: number,
  storedMonthsKey: string,
  prevYear?: MonthlyData | null,
): string {
  return [
    year,
    month,
    data?.classifiedSales.records.length ?? 0,
    prevYear?.classifiedSales.records.length ?? 0,
    data?.categoryTimeSales.records.length ?? 0,
    prevYear?.categoryTimeSales.records.length ?? 0,
    data?.departmentKpi.records.length ?? 0,
    data?.purchase.records.length ?? 0,
    data?.flowers.records.length ?? 0,
    data?.stores.size ?? 0,
    data?.budget.size ?? 0,
    data?.settings.size ?? 0,
    storedMonthsKey,
  ].join(':')
}

/**
 * 単月データからフィンガープリントを計算する。
 */
export function computeMonthFingerprint(data: MonthlyData): string {
  return [
    data.classifiedSales.records.length,
    data.categoryTimeSales.records.length,
    data.departmentKpi.records.length,
    data.purchase.records.length,
    data.flowers.records.length,
    data.stores.size,
    data.budget.size,
    data.settings.size,
  ].join(':')
}
