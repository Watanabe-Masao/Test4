/**
 * インポートヘルパー関数
 *
 * ImportOrchestrator から抽出。サマリーキャッシュ保存とインポート履歴保存を担う。
 * 両関数は async で await 可能。呼び出し元が失敗を検知できる。
 */
import type { ImportHistoryEntry } from '@/domain/models/analysis'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { buildStoreDaySummaryCache } from '@/application/usecases/calculation'
import type { ImportSummary } from './FileImportService'
import type { DataRepository } from '@/domain/repositories'

/** サマリーキャッシュを保存する。失敗時は false を返す（非クリティカル） */
export async function saveSummaryCache(
  data: MonthlyData,
  year: number,
  month: number,
  repo: DataRepository,
): Promise<boolean> {
  if (!repo.isAvailable()) return false
  try {
    const daysInMonth = getDaysInMonth(year, month)
    const cache = buildStoreDaySummaryCache(data, daysInMonth)
    await repo.saveSummaryCache(cache, year, month)
    return true
  } catch (e) {
    console.warn('[importHelpers] saveSummaryCache failed:', e)
    return false
  }
}

/** インポート履歴を保存する。失敗時は false を返す（非クリティカル） */
export async function saveImportHistory(
  summary: ImportSummary,
  year: number,
  month: number,
  repo: DataRepository,
  importId?: string,
): Promise<boolean> {
  if (!repo.isAvailable()) return false
  try {
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
    await repo.saveImportHistory(year, month, entry)
    return true
  } catch (e) {
    console.warn('[importHelpers] saveImportHistory failed:', e)
    return false
  }
}
