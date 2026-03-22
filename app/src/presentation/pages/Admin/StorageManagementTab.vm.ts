/**
 * StorageManagementTab ViewModel
 *
 * Pure functions for data transformation, formatting, and lookups.
 * No React or styled-components dependencies.
 *
 * @guard F7 View は ViewModel のみ受け取る
 */

import type { MonthEntry } from './StorageDataViewers.types'
import type { BackupMeta } from '@/application/hooks/useBackup'
import type { SettingsImportResult } from '@/application/hooks/useDeviceSync'

// Local type aliases to avoid direct infrastructure imports (Architecture Guard)
export interface RebuildResultVM {
  readonly monthCount: number
  readonly durationMs: number
  readonly skippedMonths: readonly { readonly year: number; readonly month: number }[]
}

export type StoragePressureLevelVM = 'normal' | 'warning' | 'critical'

// ─── Types ──────────────────────────────────────────────

export interface DeleteTarget {
  readonly year: number
  readonly month: number
}

// ─── Month Helpers ──────────────────────────────────────

export function makeMonthKey(year: number, month: number): string {
  return `${year}-${month}`
}

export function computeGrandTotalRecords(months: readonly MonthEntry[]): number {
  return months.reduce((sum, m) => sum + m.totalRecords, 0)
}

export function formatMonthTitle(year: number, month: number): string {
  return `${year}年${month}月`
}

export function formatMonthBadge(entry: MonthEntry): string {
  return `${entry.dataTypeCount}種別 / ${entry.totalRecords.toLocaleString()}件`
}

export function findCtsSummary(entry: MonthEntry): MonthEntry['summary'][number] | undefined {
  return entry.summary.find((s) => s.dataType === 'categoryTimeSales')
}

export function hasVisibleCts(entry: MonthEntry): boolean {
  const cts = findCtsSummary(entry)
  return cts !== undefined && cts.recordCount > 0
}

// ─── Delete Dialog ──────────────────────────────────────

export function findDeleteTargetEntry(
  months: readonly MonthEntry[],
  target: DeleteTarget,
): MonthEntry | undefined {
  return months.find((m) => m.year === target.year && m.month === target.month)
}

export function formatDeleteConfirmMessage(target: DeleteTarget): string {
  return `${target.year}年${target.month}月の保存データを全て削除します。`
}

// ─── Record Count Formatting ────────────────────────────

export function formatRecordCount(count: number): string {
  return count > 0 ? `${count.toLocaleString()}件` : '-'
}

// ─── Backup Preview ─────────────────────────────────────

export function formatBackupCreatedAt(createdAt: string): string {
  return new Date(createdAt).toLocaleString('ja-JP')
}

export function formatBackupMonthsList(months: readonly { year: number; month: number }[]): string {
  return months.map((m) => `${m.year}年${m.month}月`).join(', ')
}

export function formatBackupFormatInfo(preview: BackupMeta): string {
  return `v${preview.formatVersion}${preview.checksum ? ' (チェックサム付き)' : ''}`
}

// ─── Storage Pressure ───────────────────────────────────

export function getStoragePressureMessage(level: StoragePressureLevelVM): string | null {
  if (level === 'critical') {
    return 'ストレージ容量が危険水準です。不要なデータを削除してください。'
  }
  if (level !== 'normal') {
    return 'ストレージ容量が警告水準に達しています。'
  }
  return null
}

// ─── Sync Import Result ─────────────────────────────────

export function formatSyncImportResult(result: SettingsImportResult): string {
  if (result.success) {
    return `設定を適用しました（${result.keysUpdated ?? 0} 項目）`
  }
  return `エラー: ${result.error}`
}

// ─── DuckDB Rebuild ─────────────────────────────────────

export function formatRebuildSummary(result: RebuildResultVM): string {
  return `再構築完了: ${result.monthCount} 月分（${result.durationMs.toFixed(0)}ms）`
}

export function formatSkippedMonths(skippedMonths: RebuildResultVM['skippedMonths']): string {
  return `スキップ: ${skippedMonths.map((s) => `${s.year}-${s.month}`).join(', ')}`
}

export function hasSkippedMonths(result: RebuildResultVM): boolean {
  return result.skippedMonths.length > 0
}

// ─── Raw File Groups ────────────────────────────────────

export function formatRawFileGroupDataTypes(files: readonly { dataType: string }[]): string {
  return files.map((f) => f.dataType).join(', ')
}
