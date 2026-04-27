/**
 * DailyRecord — getDailyTotalCost tests
 *
 * 日別総仕入原価 = 仕入 + 店間入 + 店間出 + 部門間入 + 部門間出 + 売上納品原価
 * 全てのコスト合算を単一関数に集約する契約を固定する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { getDailyTotalCost } from '../DailyRecord'

const zeroPair = { cost: 0, price: 0 }

function pair(cost: number): { cost: number; price: number } {
  return { cost, price: 0 }
}

describe('getDailyTotalCost', () => {
  it('全て 0 なら 0', () => {
    const r = getDailyTotalCost({
      purchase: zeroPair,
      interStoreIn: zeroPair,
      interStoreOut: zeroPair,
      interDepartmentIn: zeroPair,
      interDepartmentOut: zeroPair,
      deliverySales: zeroPair,
    })
    expect(r).toBe(0)
  })

  it('purchase.cost のみ', () => {
    const r = getDailyTotalCost({
      purchase: pair(100),
      interStoreIn: zeroPair,
      interStoreOut: zeroPair,
      interDepartmentIn: zeroPair,
      interDepartmentOut: zeroPair,
      deliverySales: zeroPair,
    })
    expect(r).toBe(100)
  })

  it('6 フィールドの合算', () => {
    const r = getDailyTotalCost({
      purchase: pair(100),
      interStoreIn: pair(20),
      interStoreOut: pair(30),
      interDepartmentIn: pair(40),
      interDepartmentOut: pair(50),
      deliverySales: pair(60),
    })
    expect(r).toBe(100 + 20 + 30 + 40 + 50 + 60)
  })

  it('negative（移動 OUT）も加算（符号は入力側で制御）', () => {
    const r = getDailyTotalCost({
      purchase: pair(100),
      interStoreIn: pair(50),
      interStoreOut: pair(-50),
      interDepartmentIn: zeroPair,
      interDepartmentOut: zeroPair,
      deliverySales: zeroPair,
    })
    expect(r).toBe(100)
  })

  it('price は無視される（cost のみ合算）', () => {
    const r = getDailyTotalCost({
      purchase: { cost: 100, price: 999 },
      interStoreIn: { cost: 0, price: 999 },
      interStoreOut: { cost: 0, price: 999 },
      interDepartmentIn: { cost: 0, price: 999 },
      interDepartmentOut: { cost: 0, price: 999 },
      deliverySales: { cost: 0, price: 999 },
    })
    expect(r).toBe(100)
  })

  it('deliverySales（花+産直合算結果）が含まれる', () => {
    const r = getDailyTotalCost({
      purchase: zeroPair,
      interStoreIn: zeroPair,
      interStoreOut: zeroPair,
      interDepartmentIn: zeroPair,
      interDepartmentOut: zeroPair,
      deliverySales: pair(500),
    })
    expect(r).toBe(500)
  })
})
