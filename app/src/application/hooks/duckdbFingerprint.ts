/**
 * DuckDB データ変更検知のフィンガープリント（純粋関数）
 *
 * ImportedData のレコード数ベースで軽量に変更を判定する。
 * storedMonthsKey で過去月の増減も検知する。
 */
import type { ImportedData } from '@/domain/models/storeTypes'

export function computeFingerprint(
  data: ImportedData,
  year: number,
  month: number,
  storedMonthsKey: string,
): string {
  return [
    year,
    month,
    data.classifiedSales.records.length,
    data.prevYearClassifiedSales.records.length,
    data.categoryTimeSales.records.length,
    data.prevYearCategoryTimeSales.records.length,
    data.departmentKpi.records.length,
    Object.keys(data.purchase).length,
    Object.keys(data.flowers).length,
    data.stores.size,
    data.budget.size,
    data.settings.size,
    storedMonthsKey,
  ].join(':')
}
