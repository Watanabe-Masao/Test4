/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { processSpecialSales } from './SpecialSalesProcessor'

describe('processSpecialSales', () => {
  it('花データ処理（掛け率0.80）', () => {
    const rows = [
      ['', '', '', '0001:店舗A', ''], // 行0
      [''],
      [''], // 行1-2
      ['2026-02-01', '', '', 10000, ''], // 行3+
      ['2026-02-02', '', '', 20000, ''],
    ]

    const result = processSpecialSales(rows, 0.8)
    const febRecords = result['2026-2']?.records
    const s1d1 = febRecords?.find((r) => r.storeId === '1' && r.day === 1)
    const s1d2 = febRecords?.find((r) => r.storeId === '1' && r.day === 2)
    expect(s1d1?.price).toBe(10000)
    expect(s1d1?.cost).toBe(8000) // 10000 × 0.8
    expect(s1d2?.price).toBe(20000)
    expect(s1d2?.cost).toBe(16000) // 20000 × 0.8
  })

  it('産直データ処理（掛け率0.85）', () => {
    const rows = [['', '', '', '0001:A', ''], [''], [''], ['2026-02-01', '', '', 10000, '']]

    const result = processSpecialSales(rows, 0.85)
    const rec = result['2026-2']?.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.cost).toBe(8500) // 10000 × 0.85
  })

  it('売価0はスキップ', () => {
    const rows = [['', '', '', '0001:A', ''], [''], [''], ['2026-02-01', '', '', 0, '']]
    const result = processSpecialSales(rows, 0.8)
    const rec = result['2026-2']?.records?.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec).toBeUndefined()
  })

  it('原価は四捨五入', () => {
    const rows = [['', '', '', '0001:A', ''], [''], [''], ['2026-02-01', '', '', 333, '']]
    const result = processSpecialSales(rows, 0.8)
    const rec = result['2026-2']?.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.cost).toBe(266) // Math.round(333 × 0.8) = Math.round(266.4)
  })

  it('行数不足の場合は空', () => {
    expect(processSpecialSales([['a'], ['b'], ['c']], 0.8)).toEqual({})
  })
})
