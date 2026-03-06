import { describe, it, expect } from 'vitest'
import {
  processCategoryTimeSales,
  mergeCategoryTimeSalesData,
  isCTSSubtotalRow,
} from './CategoryTimeSalesProcessor'
import { categoryTimeSalesRecordKey } from '@/domain/models'

/** テスト用CSVデータ行の構築ヘルパー */
function makeRows(dataRows: unknown[][]): unknown[][] {
  // 行0: ヘッダー（時間帯）
  const header: unknown[] = [
    '',
    '',
    '',
    '',
    '',
    '【取引時間】',
    '【取引時間】',
    '9:00',
    '9:00',
    '10:00',
    '10:00',
  ]
  // 行1: 数量/金額ラベル
  const subHeader: unknown[] = ['', '', '', '', '', '数量', '金額', '数量', '金額', '数量', '金額']
  // 行2: カラムヘッダー
  const colHeader: unknown[] = [
    '【期間】',
    '【店舗】',
    '【部門】',
    '【ライン】',
    '【クラス】',
    '数量',
    '金額',
    '数量',
    '金額',
    '数量',
    '金額',
  ]
  return [header, subHeader, colHeader, ...dataRows]
}

describe('processCategoryTimeSales', () => {
  it('基本的なデータ行を正しくパースする', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:毎日屋A店',
        '000061:果物',
        '000601:柑橘',
        '601010:温州みかん',
        100,
        50000,
        30,
        15000,
        70,
        35000,
      ],
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
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        100,
        50000,
        30,
        15000,
        70,
        35000,
      ],
    ])

    const result = processCategoryTimeSales(rows)
    const rec = result.records[0]

    expect(rec.timeSlots).toHaveLength(2)
    expect(rec.timeSlots[0]).toEqual({ hour: 9, quantity: 30, amount: 15000 })
    expect(rec.timeSlots[1]).toEqual({ hour: 10, quantity: 70, amount: 35000 })
  })

  it('複数日・複数店舗のデータを処理できる', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        100,
        50000,
        30,
        15000,
        70,
        35000,
      ],
      [
        '2026年02月01日(日)',
        '0002:店舗B',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        80,
        40000,
        20,
        10000,
        60,
        30000,
      ],
      [
        '2026年02月02日(月)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        120,
        60000,
        40,
        20000,
        80,
        40000,
      ],
    ])

    const result = processCategoryTimeSales(rows)
    expect(result.records).toHaveLength(3)
    expect(result.records.map((r) => r.storeId)).toEqual(['1', '2', '1'])
    expect(result.records.map((r) => r.day)).toEqual([1, 1, 2])
  })

  it('日本語日付から曜日が正しくパースされる（曜日は無視、日のみ使用）', () => {
    const rows = makeRows([
      [
        '2026年02月15日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        10,
        5000,
        10,
        5000,
        0,
        0,
      ],
    ])

    const result = processCategoryTimeSales(rows)
    expect(result.records[0].day).toBe(15)
  })

  it('空行をスキップする', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        10,
        5000,
        10,
        5000,
        0,
        0,
      ],
      [null, null, null, null, null],
      [
        '2026年02月02日(月)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        20,
        10000,
        20,
        10000,
        0,
        0,
      ],
    ])

    const result = processCategoryTimeSales(rows)
    expect(result.records).toHaveLength(2)
  })

  it('targetMonth でフィルタリングされる', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        10,
        5000,
        10,
        5000,
        0,
        0,
      ],
      [
        '2026年03月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        20,
        10000,
        20,
        10000,
        0,
        0,
      ],
    ])

    const result = processCategoryTimeSales(rows, 2)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].day).toBe(1)
  })

  it('targetYear/targetMonth 未指定でもパースした日付から year/month が設定される', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        10,
        5000,
        10,
        5000,
        0,
        0,
      ],
    ])

    const result = processCategoryTimeSales(rows)
    expect(result.records[0].year).toBe(2026)
    expect(result.records[0].month).toBe(2)
  })

  it('targetYear/targetMonth 指定時、同月レコードはファイルの年を使う', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        10,
        5000,
        10,
        5000,
        0,
        0,
      ],
    ])

    const result = processCategoryTimeSales(rows, 2, 0, 2026)
    expect(result.records[0].year).toBe(2026)
    expect(result.records[0].month).toBe(2)
  })

  it('targetYear がファイルの年と異なる場合、同月レコードはファイルの年を使う（バグ修正）', () => {
    const rows = makeRows([
      [
        '2026年03月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        10,
        5000,
        10,
        5000,
        0,
        0,
      ],
    ])

    // targetYear=2025 でもファイルの日付 2026 が使われる
    const result = processCategoryTimeSales(rows, 3, 0, 2025)
    expect(result.records[0].year).toBe(2026)
    expect(result.records[0].month).toBe(3)
  })

  it('行数が足りない場合は空配列を返す', () => {
    const result = processCategoryTimeSales([['a'], ['b'], ['c']])
    expect(result.records).toEqual([])
  })

  it('数量0・金額0のスロットは除外される', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        30,
        15000,
        30,
        15000,
        0,
        0,
      ],
    ])

    const result = processCategoryTimeSales(rows)
    expect(result.records[0].timeSlots).toHaveLength(1)
    expect(result.records[0].timeSlots[0].hour).toBe(9)
  })
})

describe('processCategoryTimeSales - 小計行フィルタ', () => {
  it('部門が「合計」の行は除外される', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        10,
        5000,
        10,
        5000,
        0,
        0,
      ],
      ['2026年02月01日(日)', '0001:店舗A', '合計', '', '', 10, 5000, 10, 5000, 0, 0],
    ])
    const result = processCategoryTimeSales(rows)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].department.code).toBe('000061')
  })

  it('ラインが「小計」の行は除外される', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        10,
        5000,
        10,
        5000,
        0,
        0,
      ],
      ['2026年02月01日(日)', '0001:店舗A', '000061:果物', '小計', '', 10, 5000, 10, 5000, 0, 0],
    ])
    const result = processCategoryTimeSales(rows)
    expect(result.records).toHaveLength(1)
  })

  it('クラスが「計」で終わる行は除外される', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        10,
        5000,
        10,
        5000,
        0,
        0,
      ],
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '柑橘計',
        10,
        5000,
        10,
        5000,
        0,
        0,
      ],
    ])
    const result = processCategoryTimeSales(rows)
    expect(result.records).toHaveLength(1)
  })

  it('複数階層の合計行がすべて除外される（二重計上防止）', () => {
    const rows = makeRows([
      // 明細行
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601010:みかん',
        30,
        15000,
        30,
        15000,
        0,
        0,
      ],
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '601020:いよかん',
        20,
        10000,
        20,
        10000,
        0,
        0,
      ],
      // クラス合計
      [
        '2026年02月01日(日)',
        '0001:店舗A',
        '000061:果物',
        '000601:柑橘',
        '合計',
        50,
        25000,
        50,
        25000,
        0,
        0,
      ],
      // ライン合計
      ['2026年02月01日(日)', '0001:店舗A', '000061:果物', '合計', '', 50, 25000, 50, 25000, 0, 0],
      // 部門合計
      ['2026年02月01日(日)', '0001:店舗A', '合計', '', '', 50, 25000, 50, 25000, 0, 0],
    ])
    const result = processCategoryTimeSales(rows)
    expect(result.records).toHaveLength(2) // 明細行のみ
    expect(result.records.reduce((s, r) => s + r.totalAmount, 0)).toBe(25000) // 15000+10000
  })
})

describe('isCTSSubtotalRow', () => {
  it('「合計」を検出する', () => {
    expect(isCTSSubtotalRow('合計', '', '')).toBe(true)
    expect(isCTSSubtotalRow('', '合計', '')).toBe(true)
    expect(isCTSSubtotalRow('', '', '合計')).toBe(true)
  })

  it('「小計」「計」「total」「subtotal」を検出する', () => {
    expect(isCTSSubtotalRow('小計', '', '')).toBe(true)
    expect(isCTSSubtotalRow('', '', '果物計')).toBe(true)
    expect(isCTSSubtotalRow('', 'Total', '')).toBe(true)
    expect(isCTSSubtotalRow('', '', 'subtotal')).toBe(true)
  })

  it('通常のカテゴリ名は false', () => {
    expect(isCTSSubtotalRow('000061:果物', '000601:柑橘', '601010:みかん')).toBe(false)
  })

  it('空文字列のみは false', () => {
    expect(isCTSSubtotalRow('', '', '')).toBe(false)
  })
})

describe('categoryTimeSalesRecordKey の年月識別', () => {
  it('異なる年月のレコードは異なるキーを持つ', () => {
    const base = {
      day: 1,
      storeId: '1',
      department: { code: '01', name: 'D' },
      line: { code: '001', name: 'L' },
      klass: { code: '0001', name: 'C' },
      timeSlots: [] as const,
      totalQuantity: 10,
      totalAmount: 5000,
    }
    const jan = categoryTimeSalesRecordKey({ ...base, year: 2026, month: 1 })
    const feb = categoryTimeSalesRecordKey({ ...base, year: 2026, month: 2 })
    expect(jan).not.toBe(feb)
  })

  it('同一年月・同一キーのレコードは同じキーを持つ', () => {
    const rec = {
      year: 2026,
      month: 2,
      day: 1,
      storeId: '1',
      department: { code: '01', name: 'D' },
      line: { code: '001', name: 'L' },
      klass: { code: '0001', name: 'C' },
      timeSlots: [] as const,
      totalQuantity: 10,
      totalAmount: 5000,
    }
    expect(categoryTimeSalesRecordKey(rec)).toBe(categoryTimeSalesRecordKey(rec))
  })
})

describe('mergeCategoryTimeSalesData', () => {
  it('同一キーのレコードは後から来たデータで上書きされる', () => {
    const existing = {
      records: [
        {
          year: 2026,
          month: 2,
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
          year: 2026,
          month: 2,
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
          year: 2026,
          month: 2,
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
          year: 2026,
          month: 2,
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

describe('processCategoryTimeSales - storeNameToId', () => {
  it('コード無し店舗名は逆引きマップで数値IDに解決される', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '毎日屋A店',
        '000061:果物',
        '000601:柑橘',
        '601010:温州みかん',
        100,
        50000,
        30,
        15000,
        70,
        35000,
      ],
    ])
    const nameToId = new Map([['毎日屋A店', '1']])

    const result = processCategoryTimeSales(rows, undefined, 0, undefined, nameToId)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].storeId).toBe('1')
  })

  it('逆引きマップにない店舗名はそのまま使用される', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '未知店舗',
        '000061:果物',
        '000601:柑橘',
        '601010:温州みかん',
        100,
        50000,
        30,
        15000,
        70,
        35000,
      ],
    ])
    const nameToId = new Map([['毎日屋A店', '1']])

    const result = processCategoryTimeSales(rows, undefined, 0, undefined, nameToId)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].storeId).toBe('未知店舗')
  })

  it('コード付き店舗名は逆引きマップに関係なくコードから解決される', () => {
    const rows = makeRows([
      [
        '2026年02月01日(日)',
        '0001:毎日屋A店',
        '000061:果物',
        '000601:柑橘',
        '601010:温州みかん',
        100,
        50000,
        30,
        15000,
        70,
        35000,
      ],
    ])
    const nameToId = new Map([['毎日屋A店', '99']])

    const result = processCategoryTimeSales(rows, undefined, 0, undefined, nameToId)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].storeId).toBe('1') // コードから解決される、逆引きの99ではない
  })
})
