/**
 * @taxonomyKind T:unclassified
 */

import { describe, expect, it } from 'vitest'
import { validateImportData, hasValidationErrors } from '../importValidation'
import type { DataSummaryInput } from '@/application/services/dataSummary'
import type { ImportSummary } from '../FileImportService'
import type { ValidationMessage } from '@/domain/models/record'

/**
 * Minimal DataSummaryInput factory.
 * Individual tests override only the fields they exercise.
 */
function mkData(overrides: Partial<Record<string, unknown>> = {}): DataSummaryInput {
  const emptyRecords = { records: [] as readonly unknown[] }
  const base = {
    stores: new Map(),
    purchase: { ...emptyRecords },
    classifiedSales: { ...emptyRecords },
    categoryTimeSales: { ...emptyRecords },
    flowers: { ...emptyRecords },
    directProduce: { ...emptyRecords },
    interStoreIn: { ...emptyRecords },
    interStoreOut: { ...emptyRecords },
    consumables: { ...emptyRecords },
    departmentKpi: { ...emptyRecords },
    settings: new Map(),
    budget: new Map(),
  }
  return { ...base, ...overrides } as unknown as DataSummaryInput
}

function messagesOf(level: ValidationMessage['level'], msgs: readonly ValidationMessage[]) {
  return msgs.filter((m) => m.level === level)
}

describe('validateImportData', () => {
  it('warns when both purchase and stores are empty and errors when classifiedSales is empty', () => {
    const msgs = validateImportData(mkData())
    expect(
      msgs.some((m) => m.level === 'warning' && m.message.includes('仕入データがありません')),
    ).toBe(true)
    expect(
      msgs.some((m) => m.level === 'error' && m.message.includes('分類別売上データがありません')),
    ).toBe(true)
    expect(
      msgs.some((m) => m.level === 'warning' && m.message.includes('店舗が検出されませんでした')),
    ).toBe(true)
    expect(hasValidationErrors(msgs)).toBe(true)
  })

  it('does not emit missing purchase warning when purchase has records', () => {
    const data = mkData({
      stores: new Map([['S1', { id: 'S1', name: 'Store 1' }]]),
      purchase: { records: [{ storeId: 'S1', day: 1 }] },
      classifiedSales: {
        records: [
          { storeId: 'S1', day: 1, discount71: 0, discount72: 0, discount73: 0, discount74: 0 },
        ],
      },
      settings: new Map([['S1', { storeId: 'S1' }]]),
    })
    const msgs = validateImportData(data)
    expect(msgs.some((m) => m.message.includes('仕入データがありません'))).toBe(false)
    expect(msgs.some((m) => m.message.includes('分類別売上データがありません'))).toBe(false)
    expect(hasValidationErrors(msgs)).toBe(false)
  })

  it('warns about unknown store IDs referenced by flat records and settings', () => {
    const data = mkData({
      stores: new Map([['S1', { id: 'S1', name: 'Store 1' }]]),
      // interStoreIn references an unknown store
      interStoreIn: { records: [{ storeId: 'UNKNOWN', day: 1 }] },
      classifiedSales: {
        records: [
          { storeId: 'S1', day: 1, discount71: 0, discount72: 0, discount73: 0, discount74: 0 },
        ],
      },
      // settings for a non-existent store
      settings: new Map([
        ['S1', { storeId: 'S1' }],
        ['GHOST', { storeId: 'GHOST' }],
      ]),
    })
    const msgs = validateImportData(data)
    const warn = msgs.find((m) => m.level === 'warning' && m.message.includes('未登録店舗ID'))
    expect(warn).toBeDefined()
    // both UNKNOWN (from interStoreIn) and GHOST (from settings) should be counted
    expect(warn!.message).toContain('2件')
  })

  it('warns when inventory settings are missing for some stores', () => {
    const data = mkData({
      stores: new Map([
        ['S1', { id: 'S1', name: 'Store 1' }],
        ['S2', { id: 'S2', name: 'Store 2' }],
      ]),
      classifiedSales: {
        records: [
          { storeId: 'S1', day: 1, discount71: 0, discount72: 0, discount73: 0, discount74: 0 },
        ],
      },
      purchase: { records: [{ storeId: 'S1', day: 1 }] },
      settings: new Map([['S1', { storeId: 'S1' }]]),
    })
    const msgs = validateImportData(data)
    expect(msgs.some((m) => m.message.includes('一部店舗の在庫設定がありません'))).toBe(true)
  })

  it('warns when purchase max day is shorter than classifiedSales max day', () => {
    const data = mkData({
      stores: new Map([['S1', { id: 'S1', name: 'Store 1' }]]),
      classifiedSales: {
        records: [
          { storeId: 'S1', day: 10, discount71: 1, discount72: 0, discount73: 0, discount74: 0 },
          { storeId: 'S1', day: 20, discount71: 0, discount72: 0, discount73: 0, discount74: 0 },
        ],
      },
      purchase: {
        records: [
          { storeId: 'S1', day: 1 },
          { storeId: 'S1', day: 10 },
        ],
      },
      settings: new Map([['S1', { storeId: 'S1' }]]),
    })
    const msgs = validateImportData(data)
    const warn = msgs.find((m) => m.message.includes('仕入データの最終取込日'))
    expect(warn).toBeDefined()
    expect(warn!.details?.some((d) => d.includes('1日〜10日'))).toBe(true)
    expect(warn!.details?.some((d) => d.includes('1日〜20日'))).toBe(true)
  })

  it('emits info when budget data is missing and warning when discount data is absent', () => {
    const data = mkData({
      stores: new Map([['S1', { id: 'S1', name: 'Store 1' }]]),
      classifiedSales: {
        records: [
          { storeId: 'S1', day: 1, discount71: 0, discount72: 0, discount73: 0, discount74: 0 },
        ],
      },
      purchase: { records: [{ storeId: 'S1', day: 1 }] },
      settings: new Map([['S1', { storeId: 'S1' }]]),
    })
    const msgs = validateImportData(data)
    expect(messagesOf('info', msgs).some((m) => m.message.includes('予算データがありません'))).toBe(
      true,
    )
    expect(
      messagesOf('warning', msgs).some((m) => m.message.includes('売変データがありません')),
    ).toBe(true)
  })

  it('does not emit discount warning when any discount value is non-zero', () => {
    const data = mkData({
      stores: new Map([['S1', { id: 'S1', name: 'Store 1' }]]),
      classifiedSales: {
        records: [
          { storeId: 'S1', day: 1, discount71: 100, discount72: 0, discount73: 0, discount74: 0 },
        ],
      },
      purchase: { records: [{ storeId: 'S1', day: 1 }] },
      settings: new Map([['S1', { storeId: 'S1' }]]),
    })
    const msgs = validateImportData(data)
    expect(msgs.some((m) => m.message.includes('売変データがありません'))).toBe(false)
  })

  it('reports failed import files as errors and includes their error messages in details', () => {
    const importSummary: ImportSummary = {
      results: [
        {
          ok: false,
          filename: 'bad.csv',
          type: 'classifiedSales',
          typeName: '分類別売上',
          error: 'parse failure',
        },
        {
          ok: true,
          filename: 'good.csv',
          type: 'classifiedSales',
          typeName: '分類別売上',
          rowCount: 10,
        },
      ],
      successCount: 1,
      failureCount: 1,
      skippedFiles: [],
    } as unknown as ImportSummary
    const msgs = validateImportData(mkData(), importSummary)
    const err = msgs.find(
      (m) => m.level === 'error' && m.message.includes('1件のファイルの取り込みに失敗'),
    )
    expect(err).toBeDefined()
    expect(err!.details?.some((d) => d.includes('bad.csv') && d.includes('parse failure'))).toBe(
      true,
    )
    // info about the 1 success
    expect(
      msgs.some(
        (m) => m.level === 'info' && m.message.includes('1件のファイルを正常に取り込みました'),
      ),
    ).toBe(true)
  })

  it('surfaces warnings and skippedRows from successful imports', () => {
    const importSummary: ImportSummary = {
      results: [
        {
          ok: true,
          filename: 'good.csv',
          type: 'classifiedSales',
          typeName: '分類別売上',
          rowCount: 5,
          warnings: ['column mismatch'],
          skippedRows: ['row 3: bad value'],
        },
      ],
      successCount: 1,
      failureCount: 0,
      skippedFiles: ['unsupported.xyz'],
    } as unknown as ImportSummary
    const msgs = validateImportData(mkData(), importSummary)
    expect(msgs.some((m) => m.message.includes('スキップされました（非対応形式）'))).toBe(true)
    const readWarn = msgs.find((m) => m.message.includes('データの読み取りに関する警告'))
    expect(readWarn).toBeDefined()
    expect(readWarn!.details).toContain('column mismatch')
    const skipWarn = msgs.find((m) => m.message.includes('一部のデータ行がスキップされました'))
    expect(skipWarn).toBeDefined()
    expect(skipWarn!.details?.some((d) => d.includes('row 3'))).toBe(true)
  })
})

describe('hasValidationErrors', () => {
  it('returns true when any message is an error', () => {
    expect(
      hasValidationErrors([
        { level: 'info', message: 'a' },
        { level: 'error', message: 'b' },
      ]),
    ).toBe(true)
  })

  it('returns false when no errors exist', () => {
    expect(
      hasValidationErrors([
        { level: 'info', message: 'a' },
        { level: 'warning', message: 'b' },
      ]),
    ).toBe(false)
  })

  it('returns false for an empty array', () => {
    expect(hasValidationErrors([])).toBe(false)
  })
})
