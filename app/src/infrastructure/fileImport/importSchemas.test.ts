/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { validateRawRows, ImportSchemaError } from './importSchemas'

describe('validateRawRows', () => {
  it('正常データでエラーを投げない', () => {
    const rows = [
      ['日付', '店舗', 'グループ', '部門', 'ライン', 'クラス', '金額'],
      ['2025-01-01', 'A', 'G1', 'D1', 'L1', 'C1', 100],
    ]
    expect(() => validateRawRows('classifiedSales', rows, 'test.csv')).not.toThrow()
  })

  it('行数不足でImportSchemaErrorを投げる', () => {
    // classifiedSales は minRows=2 → 1行だと不足
    const rows = [['日付', '店舗', 'グループ', '部門', 'ライン', 'クラス', '金額']]
    expect(() => validateRawRows('classifiedSales', rows, 'test.csv')).toThrow(ImportSchemaError)
    try {
      validateRawRows('classifiedSales', rows, 'test.csv')
    } catch (e) {
      const err = e as ImportSchemaError
      expect(err.message).toContain('行数が不足')
      expect(err.dataType).toBe('classifiedSales')
      expect(err.filename).toBe('test.csv')
    }
  })

  it('列数不足でImportSchemaErrorを投げる', () => {
    // classifiedSales は minCols=7 → 3列だと不足
    const rows = [
      ['日付', '店舗', '金額'],
      ['2025-01-01', 'A', 100],
    ]
    expect(() => validateRawRows('classifiedSales', rows, 'test.csv')).toThrow(ImportSchemaError)
    try {
      validateRawRows('classifiedSales', rows, 'test.csv')
    } catch (e) {
      expect((e as ImportSchemaError).message).toContain('列数が不足')
    }
  })

  it('ヘッダのみ（データ行が全空）でImportSchemaErrorを投げる', () => {
    const rows = [
      ['日付', '店舗', 'グループ', '部門', 'ライン', 'クラス', '金額'],
      ['', '', '', '', '', '', ''],
    ]
    expect(() => validateRawRows('classifiedSales', rows, 'test.csv')).toThrow(ImportSchemaError)
    try {
      validateRawRows('classifiedSales', rows, 'test.csv')
    } catch (e) {
      expect((e as ImportSchemaError).message).toContain('データ行が含まれていません')
    }
  })

  it('境界値: ちょうどminRows行で通過する', () => {
    // purchase は minRows=3, minCols=4
    const rows = [
      ['head1', 'head2', 'head3', 'head4'],
      ['sub1', 'sub2', 'sub3', 'sub4'],
      ['data1', 'data2', 'data3', 'data4'],
    ]
    expect(() => validateRawRows('purchase', rows, 'test.xlsx')).not.toThrow()
  })

  it('categoryTimeSales は minRows=4, minCols=5 を要求する', () => {
    // 3行だと不足
    const rows = [
      ['h1', 'h2', 'h3', 'h4', 'h5'],
      ['s1', 's2', 's3', 's4', 's5'],
      ['d1', 'd2', 'd3', 'd4', 'd5'],
    ]
    expect(() => validateRawRows('categoryTimeSales', rows, 'test.csv')).toThrow(ImportSchemaError)

    // 4行なら通過
    const rows4 = [...rows, ['d2a', 'd2b', 'd2c', 'd2d', 'd2e']]
    expect(() => validateRawRows('categoryTimeSales', rows4, 'test.csv')).not.toThrow()
  })
})
