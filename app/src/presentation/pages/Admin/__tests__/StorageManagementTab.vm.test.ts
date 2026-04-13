import { describe, it, expect } from 'vitest'
import {
  makeMonthKey,
  computeGrandTotalRecords,
  formatMonthTitle,
  formatMonthBadge,
  findCtsSummary,
  hasVisibleCts,
  findDeleteTargetEntry,
  formatDeleteConfirmMessage,
  formatRecordCount,
  formatBackupCreatedAt,
  formatBackupMonthsList,
  formatBackupFormatInfo,
  getStoragePressureMessage,
  formatSyncImportResult,
  formatRebuildSummary,
  formatSkippedMonths,
  hasSkippedMonths,
  formatRawFileGroupDataTypes,
  type RebuildResultVM,
} from '../StorageManagementTab.vm'
import type { MonthEntry } from '../StorageDataViewers.types'
import type { BackupMeta } from '@/application/hooks/useBackup'
import type { SettingsImportResult } from '@/application/hooks/useDeviceSync'

const makeEntry = (
  year: number,
  month: number,
  totalRecords: number,
  dataTypeCount: number,
  summary: { dataType: string; label: string; recordCount: number }[] = [],
): MonthEntry =>
  ({
    year,
    month,
    summary,
    totalRecords,
    dataTypeCount,
  }) as unknown as MonthEntry

describe('makeMonthKey', () => {
  it('joins year and month with a hyphen', () => {
    expect(makeMonthKey(2025, 5)).toBe('2025-5')
  })
})

describe('computeGrandTotalRecords', () => {
  it('returns 0 for empty list', () => {
    expect(computeGrandTotalRecords([])).toBe(0)
  })
  it('sums totalRecords across entries', () => {
    const a = makeEntry(2025, 1, 100, 2)
    const b = makeEntry(2025, 2, 250, 3)
    const c = makeEntry(2025, 3, 50, 1)
    expect(computeGrandTotalRecords([a, b, c])).toBe(400)
  })
})

describe('formatMonthTitle', () => {
  it('renders Japanese title', () => {
    expect(formatMonthTitle(2025, 5)).toBe('2025年5月')
  })
})

describe('formatMonthBadge', () => {
  it('renders dataTypeCount and localized totalRecords', () => {
    const entry = makeEntry(2025, 5, 12345, 4)
    expect(formatMonthBadge(entry)).toBe('4種別 / 12,345件')
  })
})

describe('findCtsSummary / hasVisibleCts', () => {
  it('finds categoryTimeSales in summary', () => {
    const entry = makeEntry(2025, 5, 100, 2, [
      { dataType: 'daily', label: 'Daily', recordCount: 30 },
      { dataType: 'categoryTimeSales', label: 'CTS', recordCount: 70 },
    ])
    const cts = findCtsSummary(entry)
    expect(cts?.recordCount).toBe(70)
    expect(hasVisibleCts(entry)).toBe(true)
  })

  it('returns undefined when categoryTimeSales is absent', () => {
    const entry = makeEntry(2025, 5, 30, 1, [
      { dataType: 'daily', label: 'Daily', recordCount: 30 },
    ])
    expect(findCtsSummary(entry)).toBeUndefined()
    expect(hasVisibleCts(entry)).toBe(false)
  })

  it('hasVisibleCts returns false when recordCount is 0', () => {
    const entry = makeEntry(2025, 5, 0, 1, [
      { dataType: 'categoryTimeSales', label: 'CTS', recordCount: 0 },
    ])
    expect(hasVisibleCts(entry)).toBe(false)
  })
})

describe('findDeleteTargetEntry', () => {
  it('matches on year+month', () => {
    const a = makeEntry(2025, 1, 10, 1)
    const b = makeEntry(2025, 2, 20, 1)
    expect(findDeleteTargetEntry([a, b], { year: 2025, month: 2 })).toBe(b)
  })
  it('returns undefined when not found', () => {
    const a = makeEntry(2025, 1, 10, 1)
    expect(findDeleteTargetEntry([a], { year: 2025, month: 12 })).toBeUndefined()
  })
})

describe('formatDeleteConfirmMessage', () => {
  it('renders Japanese confirmation text', () => {
    expect(formatDeleteConfirmMessage({ year: 2025, month: 5 })).toBe(
      '2025年5月の保存データを全て削除します。',
    )
  })
})

describe('formatRecordCount', () => {
  it('returns dash for zero', () => {
    expect(formatRecordCount(0)).toBe('-')
  })
  it('renders localized number with suffix', () => {
    expect(formatRecordCount(12345)).toBe('12,345件')
  })
})

describe('formatBackupCreatedAt', () => {
  it('returns a non-empty localized string', () => {
    const result = formatBackupCreatedAt('2025-05-01T00:00:00Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatBackupMonthsList', () => {
  it('joins months with comma and Japanese format', () => {
    expect(
      formatBackupMonthsList([
        { year: 2025, month: 1 },
        { year: 2025, month: 2 },
      ]),
    ).toBe('2025年1月, 2025年2月')
  })
  it('returns empty string for empty input', () => {
    expect(formatBackupMonthsList([])).toBe('')
  })
})

describe('formatBackupFormatInfo', () => {
  it('renders formatVersion only when no checksum', () => {
    const preview = { formatVersion: 2, checksum: null } as unknown as BackupMeta
    expect(formatBackupFormatInfo(preview)).toBe('v2')
  })
  it('appends checksum marker when present', () => {
    const preview = { formatVersion: 3, checksum: 'abc' } as unknown as BackupMeta
    expect(formatBackupFormatInfo(preview)).toBe('v3 (チェックサム付き)')
  })
})

describe('getStoragePressureMessage', () => {
  it('returns null for normal', () => {
    expect(getStoragePressureMessage('normal')).toBeNull()
  })
  it('returns warning text for warning', () => {
    expect(getStoragePressureMessage('warning')).toBe('ストレージ容量が警告水準に達しています。')
  })
  it('returns critical text for critical', () => {
    expect(getStoragePressureMessage('critical')).toBe(
      'ストレージ容量が危険水準です。不要なデータを削除してください。',
    )
  })
})

describe('formatSyncImportResult', () => {
  it('renders success with keysUpdated', () => {
    const r = { success: true, keysUpdated: 3 } as unknown as SettingsImportResult
    expect(formatSyncImportResult(r)).toBe('設定を適用しました（3 項目）')
  })
  it('defaults keysUpdated to 0 when missing', () => {
    const r = { success: true } as unknown as SettingsImportResult
    expect(formatSyncImportResult(r)).toBe('設定を適用しました（0 項目）')
  })
  it('renders error message on failure', () => {
    const r = { success: false, error: 'boom' } as unknown as SettingsImportResult
    expect(formatSyncImportResult(r)).toBe('エラー: boom')
  })
})

describe('formatRebuildSummary', () => {
  it('formats month count and duration (rounded ms)', () => {
    const r: RebuildResultVM = { monthCount: 5, durationMs: 1234.567, skippedMonths: [] }
    expect(formatRebuildSummary(r)).toBe('再構築完了: 5 月分（1235ms）')
  })
})

describe('formatSkippedMonths / hasSkippedMonths', () => {
  it('formats skipped months list', () => {
    expect(
      formatSkippedMonths([
        { year: 2025, month: 1 },
        { year: 2025, month: 3 },
      ]),
    ).toBe('スキップ: 2025-1, 2025-3')
  })
  it('hasSkippedMonths returns true when list is non-empty', () => {
    const r: RebuildResultVM = {
      monthCount: 1,
      durationMs: 10,
      skippedMonths: [{ year: 2025, month: 1 }],
    }
    expect(hasSkippedMonths(r)).toBe(true)
  })
  it('hasSkippedMonths returns false when list is empty', () => {
    const r: RebuildResultVM = { monthCount: 1, durationMs: 10, skippedMonths: [] }
    expect(hasSkippedMonths(r)).toBe(false)
  })
})

describe('formatRawFileGroupDataTypes', () => {
  it('joins dataType field with comma', () => {
    expect(
      formatRawFileGroupDataTypes([
        { dataType: 'daily' },
        { dataType: 'weekly' },
        { dataType: 'monthly' },
      ]),
    ).toBe('daily, weekly, monthly')
  })
  it('returns empty string for empty input', () => {
    expect(formatRawFileGroupDataTypes([])).toBe('')
  })
})
