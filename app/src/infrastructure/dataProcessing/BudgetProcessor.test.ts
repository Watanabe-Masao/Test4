import { describe, it, expect } from 'vitest'
import { processBudget } from './BudgetProcessor'

describe('processBudget', () => {
  it('基本的な予算データ処理', () => {
    const rows = [
      ['店舗コード', '日付', '予算'],
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
      ['header', '', ''],
      ['0001', '2026-02-01', 0],
      ['0001', '2026-02-02', -100],
    ]
    const result = processBudget(rows)
    expect(result.size).toBe(0)
  })

  it('行数不足の場合は空', () => {
    expect(processBudget([['header']])).toEqual(new Map())
  })
})
