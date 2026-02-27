import { describe, it, expect } from 'vitest'
import {
  processClassifiedSales,
  extractStoresFromClassifiedSales,
  detectYearMonthFromClassifiedSales,
} from './ClassifiedSalesProcessor'

/* ── ヘルパー ───────────────────────────────── */

const HEADER = [
  '日付',
  '店舗名称',
  'グループ名称',
  '部門名称',
  'ライン名称',
  'クラス名称',
  '販売金額',
  '71売変',
  '72売変',
  '73売変',
  '74売変',
]

function row(day: number, store: string, sales: number, d71 = 0) {
  return [
    `2025-01-${String(day).padStart(2, '0')}`,
    store,
    'G1',
    'D1',
    'L1',
    'C1',
    sales,
    d71,
    0,
    0,
    0,
  ]
}

/* ── processClassifiedSales ─────────────────── */

describe('processClassifiedSales', () => {
  it('正常なCSVデータからrecordsを生成する', () => {
    const rows = [HEADER, row(1, '0001:テスト店', 50000, 1000)]
    const result = processClassifiedSales(rows)

    expect(result.records).toHaveLength(1)
    expect(result.records[0].storeId).toBe('1')
    expect(result.records[0].storeName).toBe('テスト店')
    expect(result.records[0].salesAmount).toBe(50000)
    expect(result.records[0].discount71).toBe(1000)
    expect(result.records[0].year).toBe(2025)
    expect(result.records[0].month).toBe(1)
    expect(result.records[0].day).toBe(1)
  })

  it('列順が異なるヘッダーでも正しくマッピングする', () => {
    const altHeader = [
      'グループ名称',
      '販売金額',
      '日付',
      '店舗名称',
      '部門名称',
      'ライン名称',
      'クラス名称',
      '71売変',
      '72売変',
      '73売変',
      '74売変',
    ]
    const altRow = ['G1', 30000, '2025-02-10', '0002:別店', 'D1', 'L1', 'C1', 500, 0, 0, 0]
    const result = processClassifiedSales([altHeader, altRow])

    expect(result.records).toHaveLength(1)
    expect(result.records[0].storeId).toBe('2')
    expect(result.records[0].salesAmount).toBe(30000)
    expect(result.records[0].month).toBe(2)
  })

  it('小計行がフィルタされ、skippedSubtotalRowsに記録される', () => {
    const rows = [
      HEADER,
      row(1, '0001:店A', 10000),
      ['2025-01-01', '0001:店A', '合計', '', '', '', 10000, 0, 0, 0, 0],
      row(2, '0001:店A', 20000),
    ]
    const result = processClassifiedSales(rows)

    expect(result.records).toHaveLength(2)
    expect(result.skippedSubtotalRows).toHaveLength(1)
    expect(result.skippedSubtotalRows![0].reason).toContain('合計')
  })

  it('店舗ID解析: "0001:店舗A" → id="1", name="店舗A"', () => {
    const rows = [HEADER, row(1, '0001:店舗A', 100)]
    const result = processClassifiedSales(rows)
    expect(result.records[0].storeId).toBe('1')
    expect(result.records[0].storeName).toBe('店舗A')
  })

  it('店舗ID解析: コロンなしの場合はそのまま使用', () => {
    const rows = [HEADER, row(1, '無名店舗', 100)]
    const result = processClassifiedSales(rows)
    expect(result.records[0].storeId).toBe('無名店舗')
    expect(result.records[0].storeName).toBe('無名店舗')
  })

  it('空データ（ヘッダのみ）で空配列を返す', () => {
    const result = processClassifiedSales([HEADER])
    expect(result.records).toHaveLength(0)
  })

  it('行が1行未満で空配列を返す', () => {
    const result = processClassifiedSales([])
    expect(result.records).toHaveLength(0)
  })

  it('targetMonthで対象月のみフィルタする', () => {
    const rows = [
      HEADER,
      ['2025-01-15', '0001:A', 'G1', 'D1', 'L1', 'C1', 100, 0, 0, 0, 0],
      ['2025-02-01', '0001:A', 'G1', 'D1', 'L1', 'C1', 200, 0, 0, 0, 0],
    ]
    const result = processClassifiedSales(rows, 2)
    expect(result.records).toHaveLength(1)
    expect(result.records[0].month).toBe(2)
  })
})

/* ── extractStoresFromClassifiedSales ──────── */

describe('extractStoresFromClassifiedSales', () => {
  it('全店舗を抽出する', () => {
    const rows = [
      HEADER,
      row(1, '0001:店A', 100),
      row(1, '0002:店B', 200),
      row(2, '0001:店A', 300), // 重複はスキップ
    ]
    const stores = extractStoresFromClassifiedSales(rows)
    expect(stores.size).toBe(2)
    expect(stores.get('1')!.name).toBe('店A')
    expect(stores.get('2')!.code).toBe('0002')
  })

  it('空データでは空Mapを返す', () => {
    expect(extractStoresFromClassifiedSales([]).size).toBe(0)
    expect(extractStoresFromClassifiedSales([HEADER]).size).toBe(0)
  })
})

/* ── detectYearMonthFromClassifiedSales ─────── */

describe('detectYearMonthFromClassifiedSales', () => {
  it('最初の有効な日付から年月を検出する', () => {
    const rows = [HEADER, row(15, '0001:A', 100)]
    const result = detectYearMonthFromClassifiedSales(rows)
    expect(result).toEqual({ year: 2025, month: 1 })
  })

  it('有効な日付がない場合はnullを返す', () => {
    const rows = [HEADER, ['invalid', '0001:A', 'G1', 'D1', 'L1', 'C1', 100, 0, 0, 0, 0]]
    expect(detectYearMonthFromClassifiedSales(rows)).toBeNull()
  })

  it('空データではnullを返す', () => {
    expect(detectYearMonthFromClassifiedSales([])).toBeNull()
  })
})
