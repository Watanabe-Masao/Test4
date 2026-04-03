import { describe, it, expect } from 'vitest'
import { buildBudgetTableRows } from '@/features/budget'
import type { DailyRecord } from '@/domain/models/record'

function makeDaily(day: number, overrides: Partial<DailyRecord> = {}): [number, DailyRecord] {
  return [
    day,
    {
      sales: 10000,
      grossSales: 12000,
      customers: 50,
      discountAbsolute: 200,
      ...overrides,
    } as DailyRecord,
  ]
}

describe('buildBudgetTableRows', () => {
  const daily = new Map<number, DailyRecord>([makeDaily(1), makeDaily(2), makeDaily(3)])
  const salesDaily = new Map([
    [1, 10000],
    [2, 10000],
    [3, 10000],
  ])
  const budgetDaily = new Map([
    [1, 9000],
    [2, 9000],
    [3, 9000],
  ])
  const chartData = [
    { day: 1, actualCum: 10000, budgetCum: 9000 },
    { day: 2, actualCum: 20000, budgetCum: 18000 },
    { day: 3, actualCum: 30000, budgetCum: 27000 },
  ]
  const pyMap = new Map([
    [1, 8000],
    [2, 9000],
    [3, 7000],
  ])

  it('正しい行数を返す', () => {
    const rows = buildBudgetTableRows(chartData, daily, salesDaily, budgetDaily, pyMap)
    expect(rows.length).toBe(3)
  })

  it('累積売変率が単調増加でなくても計算できる', () => {
    const rows = buildBudgetTableRows(chartData, daily, salesDaily, budgetDaily, pyMap)
    for (const row of rows) {
      expect(Number.isFinite(row.discountRateCum)).toBe(true)
      expect(Number.isFinite(row.discountRate)).toBe(true)
    }
  })

  it('前年データなし → pyDaySales=0, pyCumRatio=0', () => {
    const emptyPy = new Map<number, number>()
    const rows = buildBudgetTableRows(chartData, daily, salesDaily, budgetDaily, emptyPy)
    expect(rows[0].pyDaySales).toBe(0)
    expect(rows[0].pyCumRatio).toBe(0)
  })

  it('入力が逆順でも day 昇順で累積計算される', () => {
    const reversed = [...chartData].reverse()
    const rows = buildBudgetTableRows(reversed, daily, salesDaily, budgetDaily, pyMap)
    // day 順に並んでいること
    expect(rows[0].day).toBe(1)
    expect(rows[1].day).toBe(2)
    expect(rows[2].day).toBe(3)
    // 累積が正しいこと（day 3 の cumPrevYear = 8000 + 9000 + 7000）
    expect(rows[2].cumPrevYear).toBe(24000)
  })

  it('discountRate と discountRateCum は異なるフィールド', () => {
    const rows = buildBudgetTableRows(chartData, daily, salesDaily, budgetDaily, pyMap)
    // discountRate は日別、discountRateCum は累積
    // 単一日なら同じだが、2日目以降は異なり得る
    expect(rows[0].discountRate).toBeDefined()
    expect(rows[0].discountRateCum).toBeDefined()
  })
})
