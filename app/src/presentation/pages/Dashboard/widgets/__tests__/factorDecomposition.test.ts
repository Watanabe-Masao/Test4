import { describe, it, expect } from 'vitest'
import {
  decompose2,
  decompose3,
  decompose5,
  decomposePriceMix,
} from '@/domain/calculations/factorDecomposition'
import type { CategoryQtyAmt } from '@/domain/calculations/factorDecomposition'

/* ── Helper ─────────────────────────────────────────── */

function cat(key: string, qty: number, amt: number): CategoryQtyAmt {
  return { key, qty, amt }
}

/* ── 2要素分解: 客数効果 + 客単価効果 ────────────────── */

describe('decompose2（客数効果 + 客単価効果）', () => {
  it('客数だけが変化した場合、客単価効果=0', () => {
    const r = decompose2(100_000, 120_000, 100, 120)
    expect(r.custEffect).toBe(20_000)
    expect(r.ticketEffect).toBe(0)
    expect(r.custEffect + r.ticketEffect).toBe(20_000)
  })

  it('客単価だけが変化した場合、客数効果=0', () => {
    const r = decompose2(100_000, 120_000, 100, 100)
    expect(r.custEffect).toBe(0)
    expect(r.ticketEffect).toBe(20_000)
    expect(r.custEffect + r.ticketEffect).toBe(20_000)
  })

  it('両方変化した場合、合計が売上差に一致', () => {
    const prevSales = 100_000, curSales = 132_000
    const r = decompose2(prevSales, curSales, 100, 110)
    expect(r.custEffect + r.ticketEffect).toBe(curSales - prevSales)
  })

  it('客数ゼロの場合、0で安全に処理', () => {
    const r = decompose2(0, 50_000, 0, 50)
    expect(r.custEffect).toBe(0)
    expect(Number.isFinite(r.ticketEffect)).toBe(true)
  })
})

/* ── 3要素分解: 客数効果 + 点数効果 + 単価効果 ────── */

describe('decompose3（客数効果 + 点数効果 + 単価効果）', () => {
  it('合計が売上差に一致する（恒等式）', () => {
    const prevSales = 250_000, curSales = 396_000
    const r = decompose3(prevSales, curSales, 100, 110, 500, 660)

    // 客数効果 = 10 * 5 * 500 = 25,000
    expect(r.custEffect).toBe(25_000)
    // 点数効果 = 110 * 1 * 500 = 55,000
    expect(r.qtyEffect).toBe(55_000)
    // 単価効果 = 110 * 6 * 100 = 66,000
    expect(r.pricePerItemEffect).toBe(66_000)

    expect(r.custEffect + r.qtyEffect + r.pricePerItemEffect).toBe(curSales - prevSales)
  })

  it('点数だけ変化した場合、客数効果=0, 単価効果=0', () => {
    // prevPPI=500, curPPI=500
    const prevSales = 250_000, curSales = 300_000
    const r = decompose3(prevSales, curSales, 100, 100, 500, 600)

    expect(r.custEffect).toBe(0)
    expect(r.pricePerItemEffect).toBe(0)
    expect(r.qtyEffect).toBe(50_000)
    expect(r.custEffect + r.qtyEffect + r.pricePerItemEffect).toBe(curSales - prevSales)
  })

  it('単価だけ変化した場合、客数効果=0, 点数効果=0', () => {
    // 客数=100, 点数=500, 前年PPI=500, 当年PPI=600
    const prevSales = 250_000, curSales = 300_000
    const r = decompose3(prevSales, curSales, 100, 100, 500, 500)

    expect(r.custEffect).toBe(0)
    expect(r.qtyEffect).toBe(0)
    expect(r.pricePerItemEffect).toBe(50_000)
  })

  it('客数だけ変化した場合、点数効果=0, 単価効果=0', () => {
    // QPC=5, PPI=500, 客数 100→110
    const prevSales = 250_000, curSales = 275_000
    const r = decompose3(prevSales, curSales, 100, 110, 500, 550)

    expect(r.qtyEffect).toBe(0)
    expect(r.pricePerItemEffect).toBe(0)
    expect(r.custEffect).toBe(25_000)
  })
})

/* ── decomposePriceMix (価格効果 + ミックス効果) ───── */

describe('decomposePriceMix (価格効果 + ミックス効果)', () => {
  it('null を返す（レコードが空のとき）', () => {
    expect(decomposePriceMix([], [])).toBeNull()
  })

  it('null を返す（前年の数量が0のとき）', () => {
    const cur = [cat('A', 10, 5000)]
    const prev = [cat('A', 0, 0)]
    expect(decomposePriceMix(cur, prev)).toBeNull()
  })

  it('null を返す（当年の数量が0のとき）', () => {
    const prev = [cat('A', 10, 5000)]
    const cur = [cat('A', 0, 0)]
    expect(decomposePriceMix(cur, prev)).toBeNull()
  })

  it('価格効果 + ミックス効果 = 平均単価変動 × 総数量', () => {
    // 2カテゴリ: A (高単価), B (低単価)
    // 前年: A=100個×1000円, B=100個×500円 → 計200個, 150,000円
    // 当年: A=100個×1100円, B=100個×500円 → 計200個, 160,000円
    // 構成比は同じ(50/50) → ミックス効果=0, 価格効果のみ
    const prev = [cat('A', 100, 100_000), cat('B', 100, 50_000)]
    const cur = [cat('A', 100, 110_000), cat('B', 100, 50_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()

    // 構成比不変 → ミックス効果 ≈ 0
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
    // 価格効果 = 200 × ((1100-1000)*0.5 + (500-500)*0.5) = 200 * 50 = 10,000
    expect(Math.round(result!.priceEffect)).toBe(10_000)
    // 合計 = 総数量 × 平均単価差
    const totalChange = 160_000 - 150_000
    expect(Math.round(result!.priceEffect + result!.mixEffect)).toBe(totalChange)
  })

  it('構成比だけが変化した場合（価格据置）、価格効果≈0', () => {
    // 前年: A=100個×1000円, B=100個×500円 → 計200個
    // 当年: A=150個×1000円, B=50個×500円  → 計200個 (高単価品シフト)
    const prev = [cat('A', 100, 100_000), cat('B', 100, 50_000)]
    const cur = [cat('A', 150, 150_000), cat('B', 50, 25_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()

    // 価格据置 → 価格効果 ≈ 0
    expect(Math.abs(result!.priceEffect)).toBeLessThan(1)
    // 高単価品へのシフト → ミックス効果 > 0
    expect(result!.mixEffect).toBeGreaterThan(0)

    // 合計検証
    const totalChange = 200 * (175_000 / 200 - 150_000 / 200) // 200 * 125 = 25,000
    expect(Math.round(result!.priceEffect + result!.mixEffect)).toBe(totalChange)
  })

  it('両方変化した場合、合計が平均単価変動×総数量に一致', () => {
    // 前年: A=100個×1000円, B=100個×500円
    // 当年: A=120個×1100円, B=80個×550円 (値上げ + 高単価シフト)
    const prev = [cat('A', 100, 100_000), cat('B', 100, 50_000)]
    const cur = [cat('A', 120, 132_000), cat('B', 80, 44_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()

    const curTotalAmt = 132_000 + 44_000  // 176,000
    const prevTotalAmt = 100_000 + 50_000 // 150,000
    const curTotalQty = 200
    const avgPriceDiff = curTotalAmt / curTotalQty - prevTotalAmt / curTotalQty
    const expectedTotal = curTotalQty * avgPriceDiff

    expect(Math.round(result!.priceEffect + result!.mixEffect)).toBe(Math.round(expectedTotal))
  })

  it('新規カテゴリはミックス効果に帰属する', () => {
    // 前年: A=200個×500円 のみ
    // 当年: A=100個×500円 + B=100個×1000円 (新規)
    const prev = [cat('A', 200, 100_000)]
    const cur = [cat('A', 100, 50_000), cat('B', 100, 100_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()

    // Bは新規でp₀=p₁と仮定 → (p₁-p₀)×s₀ = 0
    expect(Math.abs(result!.priceEffect)).toBeLessThan(1)
    // Bの出現はミックスに帰属
    expect(result!.mixEffect).toBeGreaterThan(0)
  })

  it('消滅カテゴリはミックス効果に帰属する', () => {
    // 前年: A=100個×500円 + B=100個×1000円
    // 当年: A=200個×500円 のみ (Bが消滅)
    const prev = [cat('A', 100, 50_000), cat('B', 100, 100_000)]
    const cur = [cat('A', 200, 100_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()

    // Bは消滅でp₁=p₀と仮定 → (p₁-p₀)×s₀ = 0
    expect(Math.abs(result!.priceEffect)).toBeLessThan(1)
    // 高単価品Bの消滅 → ミックス効果 < 0
    expect(result!.mixEffect).toBeLessThan(0)
  })

  it('同じキーの複数レコードが正しく集約される', () => {
    // 同じカテゴリが複数レコードに存在
    const prev = [cat('A', 50, 25_000), cat('A', 50, 25_000)]
    const cur = [cat('A', 60, 36_000), cat('A', 40, 24_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()
    // 合算: prev=100個×500円, cur=100個×600円
    // 構成比変動なし(1カテゴリ) → ミックス=0
    // 価格効果 = 100 * (600-500) * 1.0 = 10,000
    expect(Math.round(result!.priceEffect)).toBe(10_000)
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
  })

  it('3カテゴリ以上でも正しく分解される', () => {
    // A=高, B=中, C=低
    const prev = [cat('A', 100, 100_000), cat('B', 100, 50_000), cat('C', 100, 30_000)]
    const cur = [cat('A', 100, 110_000), cat('B', 100, 50_000), cat('C', 100, 30_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()

    // Aだけ値上げ、構成比不変
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
    // 価格効果 ≈ 300 × (100×1/3) = 10,000
    const expected = 300 * ((1100 - 1000) * (1 / 3))
    expect(Math.round(result!.priceEffect)).toBe(Math.round(expected))
  })
})

/* ── decompose5 (5要素統合分解) ─────────────────────── */

describe('decompose5（5要素統合分解）', () => {
  it('客数効果+点数効果+価格効果+ミックス効果 = 売上差', () => {
    const prevCust = 100, curCust = 110
    // 2カテゴリ: A=高単価, B=低単価
    // 前年: A=300個×800円, B=200個×400円 → 計500個, 320,000円
    // 当年: A=400個×900円, B=260個×450円 → 計660個, 477,000円
    const prevCats = [cat('A', 300, 240_000), cat('B', 200, 80_000)]
    const curCats = [cat('A', 400, 360_000), cat('B', 260, 117_000)]

    const prevSales = 320_000, curSales = 477_000

    const result = decompose5(prevSales, curSales, prevCust, curCust, 500, 660, curCats, prevCats)
    expect(result).not.toBeNull()

    const total = result!.custEffect + result!.qtyEffect + result!.priceEffect + result!.mixEffect
    // 5要素合計が売上差に一致（丸め誤差を許容）
    expect(Math.abs(total - (curSales - prevSales))).toBeLessThan(1)
  })

  it('カテゴリデータが空の場合 null を返す', () => {
    const result = decompose5(100_000, 120_000, 100, 110, 500, 600, [], [])
    expect(result).toBeNull()
  })

  it('客数変化のみの場合、他の効果≈0', () => {
    // 客数100→110, QPC=5, PPI=500で固定, 構成比固定
    const prevCats = [cat('A', 500, 250_000)]
    const curCats = [cat('A', 550, 275_000)]
    const prevSales = 250_000, curSales = 275_000

    const result = decompose5(prevSales, curSales, 100, 110, 500, 550, curCats, prevCats)
    expect(result).not.toBeNull()

    expect(result!.custEffect).toBe(25_000)
    expect(Math.abs(result!.qtyEffect)).toBeLessThan(1)
    expect(Math.abs(result!.priceEffect)).toBeLessThan(1)
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
  })

  it('価格変化のみの場合、客数効果=0, 点数効果=0', () => {
    // 客数=100, QPC=5, カテゴリ1つで構成比固定, 価格だけ上昇
    const prevCats = [cat('A', 500, 250_000)]
    const curCats = [cat('A', 500, 300_000)]
    const prevSales = 250_000, curSales = 300_000

    const result = decompose5(prevSales, curSales, 100, 100, 500, 500, curCats, prevCats)
    expect(result).not.toBeNull()

    expect(result!.custEffect).toBe(0)
    expect(Math.abs(result!.qtyEffect)).toBeLessThan(1)
    // 1カテゴリなのでミックス≈0, 価格効果で全額
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
    expect(Math.round(result!.priceEffect)).toBe(50_000)
  })
})
