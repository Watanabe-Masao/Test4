import { describe, it, expect } from 'vitest'
import { processBudget } from './BudgetProcessor'

describe('processBudget', () => {
  it('ピボット形式の予算データ処理', () => {
    const rows = [
      ['', '', '', '0001:店舗A', '0002:店舗B'],
      ['月日', '', '', '売上予算', '売上予算'],
      ['期間合計', '', '', 450000, 150000],
      ['2026-02-01', '', '', 200000, 150000],
      ['2026-02-02', '', '', 250000, 0],
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
      ['', '', '', '0001:A'],
      ['月日', '', '', '売上予算'],
      ['合計', '', '', 0],
      ['2026-02-01', '', '', 0],
      ['2026-02-02', '', '', -100],
    ]
    const result = processBudget(rows)
    expect(result.size).toBe(0)
  })

  it('行数不足の場合は空', () => {
    expect(processBudget([['header'], ['sub'], ['total']])).toEqual(new Map())
  })

  it('店舗コードが見つからない場合は空', () => {
    const rows = [
      ['', '', '', 'invalid'],
      ['月日'],
      ['合計'],
      ['2026-02-01', '', '', 100000],
    ]
    expect(processBudget(rows)).toEqual(new Map())
  })
})
