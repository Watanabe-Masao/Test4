/**
 * storeIdNormalization.ts — storeId 正規化テスト
 *
 * 検証対象:
 * - normalizeRecordStoreIds:
 *   - stores 空 → data をそのまま返す
 *   - classifiedSales の storeName → id に変換
 *   - categoryTimeSales も同様
 *   - 変更なしなら同じオブジェクト参照を返す
 *   - storeName prop が設定される (fallback で storeId 旧値)
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { normalizeRecordStoreIds } from '../storeIdNormalization'

describe('normalizeRecordStoreIds', () => {
  it('stores 空 → そのまま返す', () => {
    const data = {
      stores: new Map(),
      classifiedSales: { records: [{ storeId: 'A' }] },
      categoryTimeSales: { records: [{ storeId: 'A' }] },
    }
    const result = normalizeRecordStoreIds(data)
    expect(result).toBe(data)
  })

  it('storeName → id に変換 (classifiedSales)', () => {
    const data = {
      stores: new Map([['1', { name: 'Store A' }]]),
      classifiedSales: { records: [{ storeId: 'Store A' }] },
      categoryTimeSales: { records: [] },
    }
    const result = normalizeRecordStoreIds(data)
    expect(result.classifiedSales.records[0].storeId).toBe('1')
  })

  it('classifiedSales: storeName を元の storeId (name) に設定', () => {
    const data = {
      stores: new Map([['1', { name: 'Store A' }]]),
      classifiedSales: { records: [{ storeId: 'Store A' }] },
      categoryTimeSales: { records: [] },
    }
    const result = normalizeRecordStoreIds(data)
    expect((result.classifiedSales.records[0] as unknown as { storeName: string }).storeName).toBe(
      'Store A',
    )
  })

  it('既に storeName がある場合は上書きしない', () => {
    const data = {
      stores: new Map([['1', { name: 'Store A' }]]),
      classifiedSales: { records: [{ storeId: 'Store A', storeName: 'Existing' }] },
      categoryTimeSales: { records: [] },
    }
    const result = normalizeRecordStoreIds(data)
    expect((result.classifiedSales.records[0] as unknown as { storeName: string }).storeName).toBe(
      'Existing',
    )
  })

  it('categoryTimeSales の storeName → id 変換', () => {
    const data = {
      stores: new Map([['2', { name: 'Store B' }]]),
      classifiedSales: { records: [] },
      categoryTimeSales: { records: [{ storeId: 'Store B' }] },
    }
    const result = normalizeRecordStoreIds(data)
    expect(result.categoryTimeSales.records[0].storeId).toBe('2')
  })

  it('すでに ID が正しい場合は変更なし → 同じ参照を返す', () => {
    const data = {
      stores: new Map([['1', { name: 'Store A' }]]),
      classifiedSales: { records: [{ storeId: '1' }] },
      categoryTimeSales: { records: [{ storeId: '1' }] },
    }
    const result = normalizeRecordStoreIds(data)
    expect(result).toBe(data)
  })

  it('該当 name が無い → そのままの storeId', () => {
    const data = {
      stores: new Map([['1', { name: 'Store A' }]]),
      classifiedSales: { records: [{ storeId: 'Unknown Store' }] },
      categoryTimeSales: { records: [] },
    }
    const result = normalizeRecordStoreIds(data)
    expect(result.classifiedSales.records[0].storeId).toBe('Unknown Store')
  })

  it('classifiedSales のみ変更、categoryTimeSales は変更なし', () => {
    const data = {
      stores: new Map([['1', { name: 'Store A' }]]),
      classifiedSales: { records: [{ storeId: 'Store A' }] },
      categoryTimeSales: { records: [{ storeId: '1' }] },
    }
    const result = normalizeRecordStoreIds(data)
    // 変更なしの CTS は同じ参照を維持
    expect(result.categoryTimeSales).toBe(data.categoryTimeSales)
    // 変更有の CS は新しい参照
    expect(result.classifiedSales).not.toBe(data.classifiedSales)
  })

  it('複数レコードで一部だけ変更される', () => {
    const data = {
      stores: new Map([
        ['1', { name: 'Store A' }],
        ['2', { name: 'Store B' }],
      ]),
      classifiedSales: {
        records: [
          { storeId: 'Store A' }, // needs normalization
          { storeId: '2' }, // already normalized
        ],
      },
      categoryTimeSales: { records: [] },
    }
    const result = normalizeRecordStoreIds(data)
    expect(result.classifiedSales.records[0].storeId).toBe('1')
    expect(result.classifiedSales.records[1].storeId).toBe('2')
  })
})
