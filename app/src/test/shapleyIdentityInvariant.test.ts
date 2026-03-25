/**
 * シャープリー恒等式の不変条件テスト
 *
 * CLAUDE.md の数学的不変条件:
 * - decompose2: custEffect + ticketEffect = curSales - prevSales
 * - decompose3: custEffect + qtyEffect + pricePerItemEffect = curSales - prevSales
 * - decompose5: custEffect + qtyEffect + priceEffect + mixEffect = curSales - prevSales
 *
 * 多様な入力パターンで恒等式が常に成立することを検証する。
 *
 * @guard D1 要因分解の合計は売上差に完全一致
 * @guard D3 不変条件はテストで守る
 */
import { describe, it, expect } from 'vitest'
import { decompose2, decompose3, decompose5 } from '@/domain/calculations/factorDecomposition'

const EPSILON = 1e-6

// ── テストデータ ──

interface ScenarioBase {
  readonly label: string
  readonly prevSales: number
  readonly curSales: number
  readonly prevCust: number
  readonly curCust: number
}

const SCENARIOS: readonly ScenarioBase[] = [
  { label: '標準ケース', prevSales: 1000000, curSales: 1200000, prevCust: 500, curCust: 550 },
  { label: '売上減少', prevSales: 1500000, curSales: 1300000, prevCust: 700, curCust: 600 },
  { label: '売上変化なし', prevSales: 500000, curSales: 500000, prevCust: 200, curCust: 200 },
  { label: '客数ゼロ→増加', prevSales: 0, curSales: 300000, prevCust: 0, curCust: 100 },
  { label: '大幅増加', prevSales: 100000, curSales: 10000000, prevCust: 50, curCust: 5000 },
  { label: '微少売上', prevSales: 1, curSales: 2, prevCust: 1, curCust: 1 },
]

// ── decompose2 ──

describe('D1: decompose2 シャープリー恒等式', () => {
  for (const s of SCENARIOS) {
    it(`${s.label}: custEffect + ticketEffect = 売上差`, () => {
      const result = decompose2(s.prevSales, s.curSales, s.prevCust, s.curCust)
      const sum = result.custEffect + result.ticketEffect
      const expected = s.curSales - s.prevSales

      expect(Math.abs(sum - expected)).toBeLessThan(EPSILON)
    })
  }
})

// ── decompose3 ──

describe('D1: decompose3 シャープリー恒等式', () => {
  const QTY_SCENARIOS = SCENARIOS.map((s) => ({
    ...s,
    prevTotalQty: s.prevCust * 3, // 1人あたり3点
    curTotalQty: s.curCust * 3.5, // 1人あたり3.5点（点数増加）
  }))

  for (const s of QTY_SCENARIOS) {
    it(`${s.label}: custEffect + qtyEffect + pricePerItemEffect = 売上差`, () => {
      const result = decompose3(
        s.prevSales,
        s.curSales,
        s.prevCust,
        s.curCust,
        s.prevTotalQty,
        s.curTotalQty,
      )
      const sum = result.custEffect + result.qtyEffect + result.pricePerItemEffect
      const expected = s.curSales - s.prevSales

      expect(Math.abs(sum - expected)).toBeLessThan(EPSILON)
    })
  }
})

// ── decompose5 ──

describe('D1: decompose5 シャープリー恒等式', () => {
  it('4要素の合計が売上差に完全一致する', () => {
    const prevSales = 1000000
    const curSales = 1200000
    const prevCust = 500
    const curCust = 550
    const prevCategories = [
      { key: 'food', qty: 1000, amt: 600000 },
      { key: 'drink', qty: 500, amt: 400000 },
    ]
    const curCategories = [
      { key: 'food', qty: 1200, amt: 750000 },
      { key: 'drink', qty: 450, amt: 450000 },
    ]
    const prevTotalQty = prevCategories.reduce((s, c) => s + c.qty, 0)
    const curTotalQty = curCategories.reduce((s, c) => s + c.qty, 0)

    const result = decompose5(
      prevSales,
      curSales,
      prevCust,
      curCust,
      prevTotalQty,
      curTotalQty,
      curCategories,
      prevCategories,
    )

    expect(result).not.toBeNull()
    if (!result) return

    const sum = result.custEffect + result.qtyEffect + result.priceEffect + result.mixEffect
    const expected = curSales - prevSales

    expect(Math.abs(sum - expected)).toBeLessThan(EPSILON)
  })

  it('カテゴリ消滅・新規追加でも恒等式が成立する', () => {
    const prevSales = 800000
    const curSales = 900000
    const prevCust = 400
    const curCust = 420
    // 前年にあった drink が消滅し、新たに snack が出現
    const prevCategories = [
      { key: 'food', qty: 800, amt: 500000 },
      { key: 'drink', qty: 400, amt: 300000 },
    ]
    const curCategories = [
      { key: 'food', qty: 900, amt: 600000 },
      { key: 'snack', qty: 300, amt: 300000 },
    ]
    const prevTotalQty = prevCategories.reduce((s, c) => s + c.qty, 0)
    const curTotalQty = curCategories.reduce((s, c) => s + c.qty, 0)

    const result = decompose5(
      prevSales,
      curSales,
      prevCust,
      curCust,
      prevTotalQty,
      curTotalQty,
      curCategories,
      prevCategories,
    )

    expect(result).not.toBeNull()
    if (!result) return

    const sum = result.custEffect + result.qtyEffect + result.priceEffect + result.mixEffect
    const expected = curSales - prevSales

    expect(Math.abs(sum - expected)).toBeLessThan(EPSILON)
  })
})
