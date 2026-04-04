/**
 * インポートヘルパー関数
 *
 * ImportOrchestrator から抽出。サマリーキャッシュ保存とインポート履歴保存を担う。
 */
import type { ImportHistoryEntry } from '@/domain/models/analysis'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { buildStoreDaySummaryCache } from '@/application/usecases/calculation'
import type { ImportSummary } from './FileImportService'
import type { DataRepository } from '@/domain/repositories'

export function saveSummaryCache(
  data: MonthlyData,
  year: number,
  month: number,
  repo: DataRepository,
): void {
  if (!repo.isAvailable()) return
  try {
    const daysInMonth = getDaysInMonth(year, month)
    const cache = buildStoreDaySummaryCache(data, daysInMonth)
    repo.saveSummaryCache(cache, year, month).catch((e) => {
      console.warn('[ImportOrchestrator] saveSummaryCache failed:', e)
    })
  } catch (e) {
    console.warn('[ImportOrchestrator] buildStoreDaySummaryCache failed:', e)
  }
}

export function saveImportHistory(
  summary: ImportSummary,
  year: number,
  month: number,
  repo: DataRepository,
  importId?: string,
): void {
  if (!repo.isAvailable()) return
  const entry: ImportHistoryEntry = {
    importedAt: new Date().toISOString(),
    ...(importId ? { importId } : {}),
    files: summary.results
      .filter((r) => r.ok)
      .map((r) => ({
        filename: r.filename,
        ...(r.relativePath ? { relativePath: r.relativePath } : {}),
        type: r.type,
        typeName: r.typeName,
        rowCount: r.rowCount,
        importedCount: r.rowCount,
      })),
    successCount: summary.successCount,
    failureCount: summary.failureCount,
  }
  repo.saveImportHistory(year, month, entry).catch((e) => {
    console.error('[ImportOrchestrator] saveImportHistory failed:', e)
  })
}
