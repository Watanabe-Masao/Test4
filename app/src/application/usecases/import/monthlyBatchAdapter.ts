/**
 * MonthlyImportBatch adapter
 *
 * processDroppedFiles() の結果（MonthlyData + MonthPartitions）を
 * 月別 MonthlyData の Map に変換する。
 * execution.artifacts[].attributions から月別 ImportSummary を構築する。
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { ImportExecution } from '@/domain/models/ImportProvenance'
import type { ImportSummary, FileImportResult } from '@/domain/models/ImportResult'
import { filterDataForMonth, extractRecordMonths } from './FileImportService'
import type { MonthPartitions } from './FileImportService'
import type { MonthlyImportBatch } from './monthlyImportTypes'

/** monthKey 生成 */
function mk(year: number, month: number): string {
  return `${year}-${month}`
}

/**
 * execution.artifacts の attributions を使って月別 ImportSummary を構築する。
 *
 * 各 artifact が複数月に寄与する場合、その artifact の FileImportResult は
 * 寄与するすべての月の summary に含まれる。
 */
function buildSummaryByMonth(
  summary: ImportSummary,
  execution: ImportExecution,
): ReadonlyMap<string, ImportSummary> {
  const byMonth = new Map<string, FileImportResult[]>()

  for (let i = 0; i < execution.artifacts.length; i++) {
    const artifact = execution.artifacts[i]
    const fileResult = summary.results[i]
    if (!fileResult) continue

    if (!artifact.ok) continue // エラーファイルは月別 summary に含めない

    const monthKeys = new Set<string>()
    for (const attr of artifact.attributions) {
      monthKeys.add(mk(attr.year, attr.month))
    }

    for (const key of monthKeys) {
      const arr = byMonth.get(key) ?? []
      // attribution から importedCount を取得してrowCountに反映
      const attr = artifact.attributions.find((a) => mk(a.year, a.month) === key)
      const monthResult: FileImportResult = {
        ...fileResult,
        rowCount: attr?.importedCount ?? fileResult.rowCount,
      }
      arr.push(monthResult)
      byMonth.set(key, arr)
    }
  }

  const result = new Map<string, ImportSummary>()
  for (const [key, results] of byMonth) {
    const successCount = results.filter((r) => r.ok).length
    const failureCount = results.filter((r) => !r.ok).length
    result.set(key, { results, successCount, failureCount })
  }

  return result
}

/**
 * processDroppedFiles の結果を MonthlyImportBatch に変換する。
 *
 * 1. extractRecordMonths() で含まれる年月を特定
 * 2. 各年月に対して filterDataForMonth() で MonthlyData をフィルタ
 * 3. Map<monthKey, MonthlyData> として返す
 * 4. execution.artifacts から月別 ImportSummary を構築
 */
export function toMonthlyImportBatch(
  processedData: MonthlyData,
  monthPartitions: MonthPartitions,
  summary: ImportSummary,
  detectedYearMonth: { year: number; month: number } | null,
  execution: ImportExecution,
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

  const summaryByMonth = buildSummaryByMonth(summary, execution)

  return {
    months,
    detectedYearMonth,
    monthPartitions,
    summary,
    execution,
    summaryByMonth,
  }
}
