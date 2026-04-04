/**
 * MonthlyImportBatch adapter
 *
 * processDroppedFiles() の結果（MonthlyData + MonthPartitions）を
 * 月別 MonthlyData の Map に変換する。
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'
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
 * 2. 各年月に対して filterDataForMonth() で MonthlyData をフィルタ
 * 3. Map<monthKey, MonthlyData> として返す
 */
export function toMonthlyImportBatch(
  processedData: MonthlyData,
  monthPartitions: MonthPartitions,
  summary: ImportSummary,
  detectedYearMonth: { year: number; month: number } | null,
): MonthlyImportBatch {
  let recordMonths = extractRecordMonths(processedData, monthPartitions)

  // settings-only import 等でレコード月が検出されない場合、detectedYearMonth をフォールバック
  if (recordMonths.length === 0 && detectedYearMonth) {
    recordMonths = [{ year: detectedYearMonth.year, month: detectedYearMonth.month }]
  }

  const months = new Map<string, MonthlyData>()

  for (const { year, month } of recordMonths) {
    const filtered = filterDataForMonth(processedData, year, month, monthPartitions)
    // filterDataForMonth returns MonthlyData directly; update origin for this month slice
    const monthly: MonthlyData = {
      ...filtered,
      origin: { year, month, importedAt: new Date().toISOString() },
    }
    months.set(mk(year, month), monthly)
  }

  return {
    months,
    detectedYearMonth,
    monthPartitions,
    summary,
  }
}
