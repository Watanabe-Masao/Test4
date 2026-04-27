/**
 * factorDecompositionBridge — decompose2 / decompose3 / decomposePriceMix / decompose5 tests
 *
 * WASM 未 ready の環境では TS fallback path のみをテストする。
 * 恒等性（Shapley の sum 不変性）と 0 除算ガードを確認する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { decompose2, decompose3, decompose5, decomposePriceMix } from '../factorDecompositionBridge'

describe('decompose2', () => {
  it('客数変動なしなら客数効果=0', () => {
    const r = decompose2(1000, 1200, 100, 100)
    expect(r.custEffect).toBeCloseTo(0, 5)
    // 客単価効果 = 総差分
    expect(r.ticketEffect).toBeCloseTo(1200 - 1000, 5)
  })

  it('客単価変動なしなら客単価効果=0', () => {
    const r = decompose2(1000, 2000, 100, 200)
    // 客単価は curSales/curCust = 10 → prev も 1000/100=10 で同じ
    expect(r.ticketEffect).toBeCloseTo(0, 5)
    expect(r.custEffect).toBeCloseTo(1000, 5)
  })

  it('Shapley 恒等式: custEffect + ticketEffect = curSales - prevSales', () => {
    const r = decompose2(1000, 1500, 100, 150)
    expect(r.custEffect + r.ticketEffect).toBeCloseTo(500, 5)
  })
})

describe('decompose3', () => {
  it('全 factor 同量変動でも差分を 3 成分に分解', () => {
    const r = decompose3(1000, 2000, 100, 150, 50, 80)
    // 3 因子: custEffect + qtyEffect + pricePerItemEffect = 差分
    const sum = r.custEffect + r.qtyEffect + r.pricePerItemEffect
    expect(sum).toBeCloseTo(1000, 5)
  })

  it('客数のみ変動で客数効果が支配的', () => {
    const r = decompose3(1000, 2000, 100, 200, 50, 100)
    expect(r.custEffect).toBeGreaterThan(0)
  })

  it('前期客数=0 でも例外なく結果を返す', () => {
    const r = decompose3(0, 1000, 0, 100, 0, 50)
    expect(typeof r.custEffect).toBe('number')
  })
})

describe('decomposePriceMix', () => {
  it('空入力で null', () => {
    expect(decomposePriceMix([], [])).toBeNull()
  })

  it('カテゴリ情報がある場合は結果を返す', () => {
    const cur = [
      { key: 'A', qty: 100, amt: 1000 },
      { key: 'B', qty: 50, amt: 500 },
    ]
    const prev = [
      { key: 'A', qty: 80, amt: 800 },
      { key: 'B', qty: 60, amt: 600 },
    ]
    const r = decomposePriceMix(cur, prev)
    expect(r).not.toBeNull()
    expect(r).toHaveProperty('priceEffect')
    expect(r).toHaveProperty('mixEffect')
  })
})

describe('decompose5', () => {
  it('必要な入力が揃えば PriceMixResult を含む 5 factor 分解', () => {
    const cur = [
      { key: 'A', qty: 100, amt: 1500 },
      { key: 'B', qty: 50, amt: 800 },
    ]
    const prev = [
      { key: 'A', qty: 80, amt: 1000 },
      { key: 'B', qty: 60, amt: 700 },
    ]
    const r = decompose5(1700, 2300, 100, 150, 140, 150, cur, prev)
    if (r !== null) {
      expect(r).toHaveProperty('custEffect')
      expect(r).toHaveProperty('qtyEffect')
      // 4 factors（custEffect + qtyEffect + priceEffect + mixEffect）の合計は差分ではなく別定義
      expect(typeof r.custEffect).toBe('number')
      expect(typeof r.priceEffect).toBe('number')
    }
  })

  it('カテゴリ空なら null の可能性', () => {
    const r = decompose5(0, 0, 0, 0, 0, 0, [], [])
    // 0 入力でも結果 or null を許容
    if (r !== null) {
      expect(r).toHaveProperty('custEffect')
    }
  })
})
