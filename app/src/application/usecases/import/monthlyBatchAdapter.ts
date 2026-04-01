/**
 * MonthlyImportBatch adapter
 *
 * processDroppedFiles() の結果（ImportedData + MonthPartitions）を
 * 月別 MonthlyData の Map に変換する。
 * infra 層を変更せず、application 層の境界で旧型を吸収する。
 */
import type { ImportedData } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import { toMonthlyData } from '@/domain/models/monthlyDataAdapter'
import { filterDataForMonth, extractRecordMonths } from './FileImportService'
import type { MonthPartitions, ImportSummary } from './FileImportService'
import type { MonthlyImportBatch } from './monthlyImportTypes'

/** monthKey 生成 */
function mk(year: number, month: number): string {
  return `${year}-${month}`
}

/**
 * processDroppedFiles の結果を MonthlyImportBatch に変換する。
 *
 * 1. extractRecordMonths() で含まれる年月を特定
 * 2. 各年月に対して filterDataForMonth() で ImportedData をフィルタ
 * 3. toMonthlyData() で MonthlyData に変換
 * 4. Map<monthKey, MonthlyData> として返す
 */
export function toMonthlyImportBatch(
  processedData: ImportedData,
  monthPartitions: MonthPartitions,
  summary: ImportSummary,
  detectedYearMonth: { year: number; month: number } | null,
): MonthlyImportBatch {
  const recordMonths = extractRecordMonths(processedData, monthPartitions)
  const months = new Map<string, MonthlyData>()

  for (const { year, month } of recordMonths) {
    const filtered = filterDataForMonth(processedData, year, month, monthPartitions)
    const monthly = toMonthlyData(filtered, {
      year,
      month,
      importedAt: new Date().toISOString(),
    })
    months.set(mk(year, month), monthly)
  }

  return {
    months,
    detectedYearMonth,
    monthPartitions,
    summary,
  }
}
