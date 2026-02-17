import { describe, it, expect } from 'vitest'
import { processBudget } from './BudgetProcessor'

describe('processBudget', () => {
  it('フラット形式の予算データ処理', () => {
    const rows = [
      ['店舗コード', '日付', '売上予算'],
      ['0001', '2026-02-01', 200000],
      ['0001', '2026-02-02', 250000],
      ['0002', '2026-02-01', 150000],
    ]

    const result = processBudget(rows)
    expect(result.size).toBe(2)

    const store1 = result.get('1')!
    expect(store1.daily.get(1)).toBe(200000)
    expect(store1.daily.get(2)).toBe(250000)
    expect(store1.total).toBe(450000)

    const store2 = result.get('2')!
    expect(store2.daily.get(1)).toBe(150000)
    expect(store2.total).toBe(150000)
  })

  it('予算≤0はスキップ', () => {
    const rows = [
      ['店舗コード', '日付', '売上予算'],
      ['0001', '2026-02-01', 0],
      ['0001', '2026-02-02', -100],
    ]
    const result = processBudget(rows)
    expect(result.size).toBe(0)
  })

  it('行数不足の場合は空', () => {
    expect(processBudget([['店舗コード', '日付', '売上予算']])).toEqual(new Map())
  })

  it('店舗コードが空の行はスキップ', () => {
    const rows = [
      ['店舗コード', '日付', '売上予算'],
      ['', '2026-02-01', 100000],
      ['0001', '2026-02-01', 200000],
    ]
    const result = processBudget(rows)
    expect(result.size).toBe(1)
    expect(result.get('1')?.daily.get(1)).toBe(200000)
  })

  it('日付が無効な行はスキップ', () => {
    const rows = [
      ['店舗コード', '日付', '売上予算'],
      ['0001', '合計', 500000],
      ['0001', '2026-02-01', 200000],
    ]
    const result = processBudget(rows)
    expect(result.size).toBe(1)
    expect(result.get('1')?.daily.size).toBe(1)
    expect(result.get('1')?.total).toBe(200000)
  })

  it('5桁店舗コードも処理可能', () => {
    const rows = [
      ['店舗コード', '日付', '売上予算'],
      ['81257', '2026-02-01', 300000],
    ]
    const result = processBudget(rows)
    expect(result.size).toBe(1)
    expect(result.get('81257')?.daily.get(1)).toBe(300000)
  })

  it('Excelシリアル値の日付に対応', () => {
    // 46054 = 2026-02-01 in Excel serial
    const rows = [
      ['店舗コード', '日付', '売上予算'],
      ['0001', 46054, 200000],
    ]
    const result = processBudget(rows)
    expect(result.size).toBe(1)
    expect(result.get('1')?.daily.get(1)).toBe(200000)
  })

  it('複数店舗・複数日の集計', () => {
    const rows = [
      ['店舗コード', '日付', '売上予算'],
      ['0001', '2026-02-01', 100000],
      ['0001', '2026-02-02', 150000],
      ['0001', '2026-02-03', 120000],
      ['0006', '2026-02-01', 80000],
      ['0006', '2026-02-02', 90000],
    ]
    const result = processBudget(rows)
    expect(result.size).toBe(2)
    expect(result.get('1')?.total).toBe(370000)
    expect(result.get('1')?.daily.size).toBe(3)
    expect(result.get('6')?.total).toBe(170000)
    expect(result.get('6')?.daily.size).toBe(2)
  })
})
