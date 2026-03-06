import { describe, it, expect } from 'vitest'
import { sanitizeNumericValues, validateLoadedData, budgetFromSerializable } from './serialization'

/* ── sanitizeNumericValues ───────────────────── */

describe('sanitizeNumericValues', () => {
  it('NaN を 0 に正規化する', () => {
    expect(sanitizeNumericValues(NaN)).toBe(0)
  })

  it('Infinity を 0 に正規化する', () => {
    expect(sanitizeNumericValues(Infinity)).toBe(0)
    expect(sanitizeNumericValues(-Infinity)).toBe(0)
  })

  it('有限数はそのまま返す', () => {
    expect(sanitizeNumericValues(42)).toBe(42)
    expect(sanitizeNumericValues(-3.14)).toBe(-3.14)
    expect(sanitizeNumericValues(0)).toBe(0)
  })

  it('配列内のNaN/Infinityを再帰的に正規化する', () => {
    const result = sanitizeNumericValues([1, NaN, Infinity, 'text'])
    expect(result).toEqual([1, 0, 0, 'text'])
  })

  it('オブジェクト内のNaN/Infinityを再帰的に正規化する', () => {
    const result = sanitizeNumericValues({ a: 1, b: NaN, c: { d: Infinity } })
    expect(result).toEqual({ a: 1, b: 0, c: { d: 0 } })
  })

  it('null/undefinedはそのまま返す', () => {
    expect(sanitizeNumericValues(null)).toBeNull()
    expect(sanitizeNumericValues(undefined)).toBeUndefined()
  })
})

/* ── validateLoadedData ──────────────────────── */

describe('validateLoadedData', () => {
  function makeValidData(): Record<string, unknown> {
    return {
      purchase: { records: [] },
      interStoreIn: { records: [] },
      interStoreOut: { records: [] },
      flowers: { records: [] },
      directProduce: { records: [] },
      consumables: { records: [] },
      stores: new Map(),
      suppliers: new Map(),
      settings: new Map(),
      budget: new Map(),
      classifiedSales: { records: [] },
      categoryTimeSales: { records: [] },
      departmentKpi: { records: [] },
    }
  }

  it('正常な構造で true を返す', () => {
    expect(validateLoadedData(makeValidData())).toBe(true)
  })

  it('stores が Map でない場合 false を返す', () => {
    const data = makeValidData()
    data.stores = {}
    expect(validateLoadedData(data)).toBe(false)
  })

  it('classifiedSales.records が配列でない場合 false を返す', () => {
    const data = makeValidData()
    data.classifiedSales = { records: 'not-array' }
    expect(validateLoadedData(data)).toBe(false)
  })

  it('classifiedSales の不正レコードを検出する', () => {
    const data = makeValidData()
    data.classifiedSales = {
      records: [{ year: 2025, month: 13, day: 1, storeId: 's1', salesAmount: 100 }], // month > 12
    }
    expect(validateLoadedData(data)).toBe(false)
  })

  it('classifiedSales の正常レコードは通過する', () => {
    const data = makeValidData()
    data.classifiedSales = {
      records: [
        {
          year: 2025,
          month: 1,
          day: 15,
          storeId: 's1',
          storeName: 'A',
          salesAmount: 100,
          groupName: 'G',
          departmentName: 'D',
          lineName: 'L',
          className: 'C',
          discount71: 0,
          discount72: 0,
          discount73: 0,
          discount74: 0,
        },
      ],
    }
    expect(validateLoadedData(data)).toBe(true)
  })

  it('categoryTimeSales の不正レコード（storeId欠損）を検出する', () => {
    const data = makeValidData()
    data.categoryTimeSales = {
      records: [{ year: 2025, month: 1, day: 1, storeId: '', totalAmount: 100 }], // storeId 空
    }
    expect(validateLoadedData(data)).toBe(false)
  })

  it('budget Map内のエントリが不正な場合 false を返す', () => {
    const data = makeValidData()
    const budgetMap = new Map<string, unknown>()
    budgetMap.set('s1', { storeId: 's1', total: NaN, daily: new Map() }) // total が NaN
    data.budget = budgetMap
    expect(validateLoadedData(data)).toBe(false)
  })
})

/* ── budgetFromSerializable ──────────────────── */

describe('budgetFromSerializable', () => {
  it('正常データから BudgetData を生成する', () => {
    const obj = { storeId: 's1', total: 1000000, daily: { '1': 50000, '2': 60000 } }
    const result = budgetFromSerializable(obj)
    expect(result).not.toBeNull()
    expect(result!.storeId).toBe('s1')
    expect(result!.total).toBe(1000000)
    expect(result!.daily.get(1)).toBe(50000)
    expect(result!.daily.get(2)).toBe(60000)
  })

  it('storeId が空文字の場合 null を返す', () => {
    expect(budgetFromSerializable({ storeId: '', total: 100, daily: {} })).toBeNull()
  })

  it('total が NaN の場合 null を返す', () => {
    expect(budgetFromSerializable({ storeId: 's1', total: NaN, daily: {} })).toBeNull()
  })

  it('日付キーが不正な場合はスキップする', () => {
    const result = budgetFromSerializable({
      storeId: 's1',
      total: 100,
      daily: { abc: 50, '32': 60, '1': 70 },
    })
    expect(result).not.toBeNull()
    // abc → スキップ, 32 → >31なのでスキップ, 1 → 有効
    expect(result!.daily.size).toBe(1)
    expect(result!.daily.get(1)).toBe(70)
  })
})
