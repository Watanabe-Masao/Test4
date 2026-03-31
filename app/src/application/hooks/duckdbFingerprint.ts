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

/**
 * 単月データからフィンガープリントを計算する。
 * ImportedData / MonthlyData の両方に対応（共通フィールドのみ使用）。
 */
export function computeMonthFingerprint(data: {
  classifiedSales: { records: readonly unknown[] }
  categoryTimeSales: { records: readonly unknown[] }
  departmentKpi: { records: readonly unknown[] }
  purchase: Record<string, unknown>
  flowers: { records?: readonly unknown[] }
  stores: ReadonlyMap<string, unknown>
  budget: ReadonlyMap<string, unknown>
  settings: ReadonlyMap<string, unknown>
}): string {
  return [
    data.classifiedSales.records.length,
    data.categoryTimeSales.records.length,
    data.departmentKpi.records.length,
    Object.keys(data.purchase).length,
    ('records' in data.flowers ? (data.flowers.records?.length ?? 0) : Object.keys(data.flowers).length),
    data.stores.size,
    data.budget.size,
    data.settings.size,
  ].join(':')
}
