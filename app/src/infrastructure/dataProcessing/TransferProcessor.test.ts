import { describe, it, expect } from 'vitest'
import { processInterStoreIn, processInterStoreOut } from './TransferProcessor'

describe('processInterStoreIn', () => {
  it('基本的な店間入データ処理', () => {
    const rows = [
      ['店コードIN', '日付', '店コードOUT', '原価金額IN', '売価金額IN'],
      ['0001', '2026-02-01', '0002', 10000, 13000],
    ]

    const result = processInterStoreIn(rows)
    const rec = result['2026-2']?.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.interStoreIn).toHaveLength(1)
    expect(rec?.interStoreIn[0].cost).toBe(10000)
    expect(rec?.interStoreIn[0].price).toBe(13000)
  })

  it('部門間移動の判定（同一店舗コード）', () => {
    const rows = [
      ['店コードIN', '日付', '店コードOUT', '原価金額IN', '売価金額IN'],
      ['0001', '2026-02-01', '0001', 5000, 6500],
    ]

    const result = processInterStoreIn(rows)
    const rec = result['2026-2']?.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.interDepartmentIn).toHaveLength(1)
    expect(rec?.interStoreIn).toHaveLength(0)
  })

  it('金額は絶対値で格納', () => {
    const rows = [['header'], ['0001', '2026-02-01', '0002', -10000, -13000]]
    const result = processInterStoreIn(rows)
    const rec = result['2026-2']?.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.interStoreIn[0].cost).toBe(10000)
    expect(rec?.interStoreIn[0].price).toBe(13000)
  })

  it('行数不足の場合は空', () => {
    expect(processInterStoreIn([['header']])).toEqual({})
  })
})

describe('processInterStoreOut', () => {
  it('基本的な店間出データ処理（Col0=日付, Col1=出庫元）', () => {
    const rows = [
      ['日付', '店コード', '店コードIN', '部門コードIN', '原価金額OUT', '売価金額OUT'],
      ['2026-02-01', '0001', '0002', '001', 10000, 13000],
    ]

    const result = processInterStoreOut(rows)
    const rec = result['2026-2']?.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.interStoreOut).toHaveLength(1)
    expect(rec?.interStoreOut[0].cost).toBe(-10000) // 負の絶対値
    expect(rec?.interStoreOut[0].price).toBe(-13000)
  })

  it('部門間移動の判定', () => {
    const rows = [['header'], ['2026-02-01', '0001', '0001', '001', 5000, 6500]]
    const result = processInterStoreOut(rows)
    const rec = result['2026-2']?.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.interDepartmentOut).toHaveLength(1)
    expect(rec?.interStoreOut).toHaveLength(0)
  })

  it('行数不足の場合は空', () => {
    expect(processInterStoreOut([['header']])).toEqual({})
  })
})
