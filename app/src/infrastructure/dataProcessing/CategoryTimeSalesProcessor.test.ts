import { describe, it, expect } from 'vitest'
import { processCategoryTimeSales, mergeCategoryTimeSalesData } from './CategoryTimeSalesProcessor'

/** テスト用CSVデータ行の構築ヘルパー */
function makeRows(dataRows: unknown[][]): unknown[][] {
  // 行0: ヘッダー（時間帯）
  const header: unknown[] = ['', '', '', '', '', '【取引時間】', '【取引時間】', '9:00', '9:00', '10:00', '10:00']
  // 行1: 数量/金額ラベル
  const subHeader: unknown[] = ['', '', '', '', '', '数量', '金額', '数量', '金額', '数量', '金額']
  // 行2: カラムヘッダー
  const colHeader: unknown[] = ['【期間】', '【店舗】', '【部門】', '【ライン】', '【クラス】', '数量', '金額', '数量', '金額', '数量', '金額']
  return [header, subHeader, colHeader, ...dataRows]
}

describe('processCategoryTimeSales', () => {
  it('基本的なデータ行を正しくパースする', () => {
    const rows = makeRows([
      ['2026年02月01日(日)', '0001:毎日屋A店', '000061:果物', '000601:柑橘', '601010:温州みかん', 100, 50000, 30, 15000, 70, 35000],
    ])

    const result = processCategoryTimeSales(rows)
    expect(result.records).toHaveLength(1)

    const rec = result.records[0]
    expect(rec.day).toBe(1)
    expect(rec.storeId).toBe('1')
    expect(rec.department).toEqual({ code: '000061', name: '果物' })
    expect(rec.line).toEqual({ code: '000601', name: '柑橘' })
    expect(rec.klass).toEqual({ code: '601010', name: '温州みかん' })
    expect(rec.totalQuantity).toBe(100)
    expect(rec.totalAmount).toBe(50000)
  })

  it('時間帯スロットが正しく抽出される', () => {
    const rows = makeRows([
      ['2026年02月01日(日)', '0001:店舗A', '000061:果物', '000601:柑橘', '601010:みかん', 100, 50000, 30, 15000, 70, 35000],
    ])

    const result = processCategoryTimeSales(rows)
    const rec = result.records[0]

    expect(rec.timeSlots).toHaveLength(2)
    expect(rec.timeSlots[0]).toEqual({ hour: 9, quantity: 30, amount: 15000 })
    expect(rec.timeSlots[1]).toEqual({ hour: 10, quantity: 70, amount: 35000 })
  })

  it('複数日・複数店舗のデータを処理できる', () => {
    const rows = makeRows([
      ['2026年02月01日(日)', '0001:店舗A', '000061:果物', '000601:柑橘', '601010:みかん', 100, 50000, 30, 15000, 70, 35000],
      ['2026年02月01日(日)', '0002:店舗B', '000061:果物', '000601:柑橘', '601010:みかん', 80, 40000, 20, 10000, 60, 30000],
      ['2026年02月02日(月)', '0001:店舗A', '000061:果物', '000601:柑橘', '601010:みかん', 120, 60000, 40, 20000, 80, 40000],
    ])

    const result = processCategoryTimeSales(rows)
    expect(result.records).toHaveLength(3)
    expect(result.records.map((r) => r.storeId)).toEqual(['1', '2', '1'])
    expect(result.records.map((r) => r.day)).toEqual([1, 1, 2])
  })

  it('日本語日付から曜日が正しくパースされる（曜日は無視、日のみ使用）', () => {
    const rows = makeRows([
      ['2026年02月15日(日)', '0001:店舗A', '000061:果物', '000601:柑橘', '601010:みかん', 10, 5000, 10, 5000, 0, 0],
    ])

    const result = processCategoryTimeSales(rows)
    expect(result.records[0].day).toBe(15)
  })

  it('空行をスキップする', () => {
    const rows = makeRows([
      ['2026年02月01日(日)', '0001:店舗A', '000061:果物', '000601:柑橘', '601010:みかん', 10, 5000, 10, 5000, 0, 0],
      [null, null, null, null, null],
      ['2026年02月02日(月)', '0001:店舗A', '000061:果物', '000601:柑橘', '601010:みかん', 20, 10000, 20, 10000, 0, 0],
    ])

    const result = processCategoryTimeSales(rows)
    expect(result.records).toHaveLength(2)
  })

  it('targetMonth でフィルタリングされる', () => {
    const rows = makeRows([
      ['2026年02月01日(日)', '0001:店舗A', '000061:果物', '000601:柑橘', '601010:みかん', 10, 5000, 10, 5000, 0, 0],
      ['2026年03月01日(日)', '0001:店舗A', '000061:果物', '000601:柑橘', '601010:みかん', 20, 10000, 20, 10000, 0, 0],
    ])

    const result = processCategoryTimeSales(rows, 2)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].day).toBe(1)
  })

  it('行数が足りない場合は空配列を返す', () => {
    const result = processCategoryTimeSales([['a'], ['b'], ['c']])
    expect(result.records).toEqual([])
  })

  it('数量0・金額0のスロットは除外される', () => {
    const rows = makeRows([
      ['2026年02月01日(日)', '0001:店舗A', '000061:果物', '000601:柑橘', '601010:みかん', 30, 15000, 30, 15000, 0, 0],
    ])

    const result = processCategoryTimeSales(rows)
    expect(result.records[0].timeSlots).toHaveLength(1)
    expect(result.records[0].timeSlots[0].hour).toBe(9)
  })
})

describe('mergeCategoryTimeSalesData', () => {
  it('同一キーのレコードは後から来たデータで上書きされる', () => {
    const existing = {
      records: [
        {
          day: 1,
          storeId: '1',
          department: { code: '01', name: '果物' },
          line: { code: '001', name: '柑橘' },
          klass: { code: '0001', name: 'みかん' },
          timeSlots: [{ hour: 9, quantity: 10, amount: 5000 }],
          totalQuantity: 10,
          totalAmount: 5000,
        },
      ],
    }
    const incoming = {
      records: [
        {
          day: 1,
          storeId: '1',
          department: { code: '01', name: '果物' },
          line: { code: '001', name: '柑橘' },
          klass: { code: '0001', name: 'みかん' },
          timeSlots: [{ hour: 9, quantity: 20, amount: 10000 }],
          totalQuantity: 20,
          totalAmount: 10000,
        },
      ],
    }

    const merged = mergeCategoryTimeSalesData(existing, incoming)
    expect(merged.records).toHaveLength(1)
    expect(merged.records[0].totalAmount).toBe(10000) // 上書きされた値
  })

  it('異なるキーのレコードは両方保持される', () => {
    const existing = {
      records: [
        {
          day: 1,
          storeId: '1',
          department: { code: '01', name: '果物' },
          line: { code: '001', name: '柑橘' },
          klass: { code: '0001', name: 'みかん' },
          timeSlots: [],
          totalQuantity: 10,
          totalAmount: 5000,
        },
      ],
    }
    const incoming = {
      records: [
        {
          day: 2,
          storeId: '1',
          department: { code: '01', name: '果物' },
          line: { code: '001', name: '柑橘' },
          klass: { code: '0001', name: 'みかん' },
          timeSlots: [],
          totalQuantity: 20,
          totalAmount: 10000,
        },
      ],
    }

    const merged = mergeCategoryTimeSalesData(existing, incoming)
    expect(merged.records).toHaveLength(2)
  })
})
