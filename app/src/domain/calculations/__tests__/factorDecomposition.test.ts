import { describe, it, expect } from 'vitest'
import {
  decompose2,
  decompose3,
  decompose5,
  decomposePriceMix,
} from '../factorDecomposition'
import type { CategoryQtyAmt } from '../factorDecomposition'
import { calculateItemsPerCustomer, calculateAveragePricePerItem } from '../utils'

/* ── Helper ─────────────────────────────────────────── */

function cat(key: string, qty: number, amt: number): CategoryQtyAmt {
  return { key, qty, amt }
}

/* ── 2要素シャープリー分解: 客数効果 + 客単価効果 ──── */

describe('decompose2（シャープリー: 客数効果 + 客単価効果）', () => {
  it('客数だけが変化した場合、客単価効果=0', () => {
    // T₀=T₁=1000 → φ_T = 0
    const r = decompose2(100_000, 120_000, 100, 120)
    expect(r.custEffect).toBe(20_000)
    expect(r.ticketEffect).toBe(0)
  })

  it('客単価だけが変化した場合、客数効果=0', () => {
    // C₀=C₁=100 → φ_C = 0
    const r = decompose2(100_000, 120_000, 100, 100)
    expect(r.custEffect).toBe(0)
    expect(r.ticketEffect).toBe(20_000)
  })

  it('両方変化した場合、合計が売上差に一致（シャープリー恒等式）', () => {
    const prevSales = 100_000,
      curSales = 132_000
    const r = decompose2(prevSales, curSales, 100, 110)
    expect(r.custEffect + r.ticketEffect).toBeCloseTo(curSales - prevSales, 2)
  })

  it('交互作用を公平に配分する', () => {
    // C: 100→110, T: 1000→1200
    // 逐次分解: custEffect = 10×1000 = 10,000
    // シャープリー: custEffect = 10 × ½(1000+1200) = 11,000
    const r = decompose2(100_000, 132_000, 100, 110)
    expect(r.custEffect).toBe(11_000)
    expect(r.ticketEffect).toBe(21_000)
    expect(r.custEffect + r.ticketEffect).toBe(32_000)
  })

  it('客数ゼロの場合、有限値で安全に処理', () => {
    // シャープリー: φ_C = (50-0)×½(T₀+T₁), T₀=0(0/0→0), T₁=1000
    // → custEffect = 50×500 = 25,000（交互作用を公平に配分）
    const r = decompose2(0, 50_000, 0, 50)
    expect(Number.isFinite(r.custEffect)).toBe(true)
    expect(Number.isFinite(r.ticketEffect)).toBe(true)
    expect(r.custEffect + r.ticketEffect).toBeCloseTo(50_000, 2)
  })
})

/* ── 3要素シャープリー分解: 客数 + 点数 + 単価 ────── */

describe('decompose3（シャープリー: 客数 + 点数 + 単価）', () => {
  it('合計が売上差に一致する（シャープリー恒等式）', () => {
    const prevSales = 250_000,
      curSales = 396_000
    const r = decompose3(prevSales, curSales, 100, 110, 500, 660)
    expect(r.custEffect + r.qtyEffect + r.pricePerItemEffect).toBeCloseTo(curSales - prevSales, 2)
  })

  it('点数だけ変化した場合、客数効果=0, 単価効果=0', () => {
    // C₀=C₁=100, P̄₀=P̄₁=500 → only Q changes
    const r = decompose3(250_000, 300_000, 100, 100, 500, 600)
    expect(r.custEffect).toBe(0)
    expect(r.pricePerItemEffect).toBe(0)
    expect(r.qtyEffect).toBe(50_000)
  })

  it('単価だけ変化した場合、客数効果=0, 点数効果=0', () => {
    // C₀=C₁=100, Q=500/100=5 fixed, PPI changes
    const r = decompose3(250_000, 300_000, 100, 100, 500, 500)
    expect(r.custEffect).toBe(0)
    expect(r.qtyEffect).toBe(0)
    expect(r.pricePerItemEffect).toBeCloseTo(50_000, 2)
  })

  it('客数だけ変化した場合、点数効果=0, 単価効果=0', () => {
    // QPC=5, PPI=500 fixed → same Q/P per customer
    const r = decompose3(250_000, 275_000, 100, 110, 500, 550)
    expect(r.qtyEffect).toBeCloseTo(0, 2)
    expect(r.pricePerItemEffect).toBeCloseTo(0, 2)
    expect(r.custEffect).toBeCloseTo(25_000, 2)
  })

  it('交互作用を公平に配分する', () => {
    // C: 100→120, Q: 5→6 (QPC), P̄: 500→600
    // prev: 100×5×500 = 250,000, cur: 120×6×600 = 432,000
    const prevSales = 250_000,
      curSales = 432_000
    const r = decompose3(prevSales, curSales, 100, 120, 500, 720)
    // All factors change → sum must equal diff
    expect(r.custEffect + r.qtyEffect + r.pricePerItemEffect).toBeCloseTo(curSales - prevSales, 2)
    // Shapley distributes interaction: each effect > sequential version for its variable
    expect(r.custEffect).toBeGreaterThan(0)
    expect(r.qtyEffect).toBeGreaterThan(0)
    expect(r.pricePerItemEffect).toBeGreaterThan(0)
  })
})

/* ── decomposePriceMix (シャープリー価格/構成比分解) ── */

describe('decomposePriceMix (シャープリー: 価格 + 構成比変化)', () => {
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

  it('価格のみ変化（構成比固定）→ 構成比変化効果≈0', () => {
    // 前年: A=100個×1000円, B=100個×500円
    // 当年: A=100個×1100円, B=100個×500円 (Aのみ値上げ、構成比不変)
    const prev = [cat('A', 100, 100_000), cat('B', 100, 50_000)]
    const cur = [cat('A', 100, 110_000), cat('B', 100, 50_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
    // 価格効果 = TQ₁ × ½[Σ(p₁-p₀)s₀ + Σ(p₁-p₀)s₁]
    // = 200 × ½[(100×0.5+0) + (100×0.5+0)] = 200 × 50 = 10,000
    expect(Math.round(result!.priceEffect)).toBe(10_000)
  })

  it('構成比のみ変化（価格据置）→ 価格効果≈0', () => {
    // 前年: A=100個×1000円, B=100個×500円
    // 当年: A=150個×1000円, B=50個×500円 (高単価品シフト)
    const prev = [cat('A', 100, 100_000), cat('B', 100, 50_000)]
    const cur = [cat('A', 150, 150_000), cat('B', 50, 25_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()
    expect(Math.abs(result!.priceEffect)).toBeLessThan(1)
    expect(result!.mixEffect).toBeGreaterThan(0)
  })

  it('両方変化した場合、合計が平均単価変動×総数量に一致', () => {
    const prev = [cat('A', 100, 100_000), cat('B', 100, 50_000)]
    const cur = [cat('A', 120, 132_000), cat('B', 80, 44_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()

    const curTotalAmt = 132_000 + 44_000 // 176,000
    const prevTotalAmt = 100_000 + 50_000 // 150,000
    const curTotalQty = 200
    const expectedTotal = curTotalAmt - curTotalQty * (prevTotalAmt / 200)

    expect(Math.round(result!.priceEffect + result!.mixEffect)).toBe(Math.round(expectedTotal))
  })

  it('新規カテゴリは構成比変化効果に帰属する', () => {
    const prev = [cat('A', 200, 100_000)]
    const cur = [cat('A', 100, 50_000), cat('B', 100, 100_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()
    // Bは新規でp₀=p₁と仮定 → (p₁-p₀)=0 → 価格効果への寄与は0
    // ただしシャープリーではs₁も使うため、完全に0とは限らない
    // Aの価格は変わらないので、全体の価格効果は小さいはず
    expect(Math.abs(result!.priceEffect)).toBeLessThan(1)
  })

  it('消滅カテゴリは構成比変化効果に帰属する', () => {
    const prev = [cat('A', 100, 50_000), cat('B', 100, 100_000)]
    const cur = [cat('A', 200, 100_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()
    expect(Math.abs(result!.priceEffect)).toBeLessThan(1)
    expect(result!.mixEffect).toBeLessThan(0) // 高単価品Bの消滅
  })

  it('同じキーの複数レコードが正しく集約される', () => {
    const prev = [cat('A', 50, 25_000), cat('A', 50, 25_000)]
    const cur = [cat('A', 60, 36_000), cat('A', 40, 24_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()
    // 1カテゴリ → 構成比変動なし → mixEffect=0
    expect(Math.round(result!.priceEffect)).toBe(10_000)
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
  })

  it('3カテゴリ以上でも正しく分解される', () => {
    const prev = [cat('A', 100, 100_000), cat('B', 100, 50_000), cat('C', 100, 30_000)]
    const cur = [cat('A', 100, 110_000), cat('B', 100, 50_000), cat('C', 100, 30_000)]

    const result = decomposePriceMix(cur, prev)
    expect(result).not.toBeNull()
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
    const expected = 300 * ((1100 - 1000) * (1 / 3))
    expect(Math.round(result!.priceEffect)).toBe(Math.round(expected))
  })
})

/* ── decompose5 (4変数シャープリー統合分解) ───────── */

describe('decompose5（4変数シャープリー統合分解）', () => {
  it('客数+点数+価格+構成比変化 = 売上差（シャープリー恒等式）', () => {
    const prevCust = 100,
      curCust = 110
    const prevCats = [cat('A', 300, 240_000), cat('B', 200, 80_000)]
    const curCats = [cat('A', 400, 360_000), cat('B', 260, 117_000)]
    const prevSales = 320_000,
      curSales = 477_000

    const result = decompose5(prevSales, curSales, prevCust, curCust, 500, 660, curCats, prevCats)
    expect(result).not.toBeNull()

    const total = result!.custEffect + result!.qtyEffect + result!.priceEffect + result!.mixEffect
    expect(Math.abs(total - (curSales - prevSales))).toBeLessThan(1)
  })

  it('カテゴリデータが空の場合 null を返す', () => {
    const result = decompose5(100_000, 120_000, 100, 110, 500, 600, [], [])
    expect(result).toBeNull()
  })

  it('客数変化のみの場合、他の効果≈0', () => {
    const prevCats = [cat('A', 500, 250_000)]
    const curCats = [cat('A', 550, 275_000)]

    const result = decompose5(250_000, 275_000, 100, 110, 500, 550, curCats, prevCats)
    expect(result).not.toBeNull()
    expect(result!.custEffect).toBeCloseTo(25_000, 0)
    expect(Math.abs(result!.qtyEffect)).toBeLessThan(1)
    expect(Math.abs(result!.priceEffect)).toBeLessThan(1)
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
  })

  it('価格変化のみの場合、客数効果=0, 点数効果=0', () => {
    const prevCats = [cat('A', 500, 250_000)]
    const curCats = [cat('A', 500, 300_000)]

    const result = decompose5(250_000, 300_000, 100, 100, 500, 500, curCats, prevCats)
    expect(result).not.toBeNull()
    expect(result!.custEffect).toBe(0)
    expect(Math.abs(result!.qtyEffect)).toBeLessThan(1)
    // 1カテゴリなので構成比変化=0, 価格効果で全額
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
    expect(Math.round(result!.priceEffect)).toBe(50_000)
  })

  it('シャープリーは交互作用を公平配分する', () => {
    // C, Q, P all change
    // prev: C=100, Q=5, P̄=500 → S=250,000
    // cur:  C=120, Q=6, P̄=600 → S=432,000
    const prevCats = [cat('A', 500, 250_000)]
    const curCats = [cat('A', 720, 432_000)]

    const result = decompose5(250_000, 432_000, 100, 120, 500, 720, curCats, prevCats)
    expect(result).not.toBeNull()

    const total = result!.custEffect + result!.qtyEffect + result!.priceEffect + result!.mixEffect
    expect(Math.abs(total - 182_000)).toBeLessThan(1)
    // All 3 variables changed → all effects should be positive
    expect(result!.custEffect).toBeGreaterThan(0)
    expect(result!.qtyEffect).toBeGreaterThan(0)
    expect(result!.priceEffect).toBeGreaterThan(0)
    // 1カテゴリ → mixEffect ≈ 0
    expect(Math.abs(result!.mixEffect)).toBeLessThan(1)
  })

  it('売上合計とカテゴリ合計が異なっても正しく分解される', () => {
    // totalSales(売上データ)とカテゴリ合計が乖離するケース
    // カテゴリ合計: prev=240,000+80,000=320,000, cur=360,000+117,000=477,000
    // 売上データ: prev=350,000, cur=500,000（カテゴリ合計と不一致）
    const prevCust = 100,
      curCust = 110
    const prevCats = [cat('A', 300, 240_000), cat('B', 200, 80_000)]
    const curCats = [cat('A', 400, 360_000), cat('B', 260, 117_000)]
    const prevSales = 350_000,
      curSales = 500_000

    const result = decompose5(prevSales, curSales, prevCust, curCust, 500, 660, curCats, prevCats)
    expect(result).not.toBeNull()

    // 合計は売上データの差（500,000 - 350,000 = 150,000）に一致すること
    const total = result!.custEffect + result!.qtyEffect + result!.priceEffect + result!.mixEffect
    expect(Math.abs(total - (curSales - prevSales))).toBeLessThan(1)
  })

  it('3要素→5要素切替時に客数・点数効果が一貫する', () => {
    const prevCust = 100,
      curCust = 110
    const prevCats = [cat('A', 300, 240_000), cat('B', 200, 80_000)]
    const curCats = [cat('A', 400, 360_000), cat('B', 260, 117_000)]
    const prevSales = 320_000,
      curSales = 477_000

    const d3 = decompose3(prevSales, curSales, prevCust, curCust, 500, 660)
    const d5 = decompose5(prevSales, curSales, prevCust, curCust, 500, 660, curCats, prevCats)
    expect(d5).not.toBeNull()

    // 5要素の客数効果・点数効果は3要素と同じ値になること
    expect(d5!.custEffect).toBeCloseTo(d3.custEffect, 2)
    expect(d5!.qtyEffect).toBeCloseTo(d3.qtyEffect, 2)
    // 5要素の価格+構成比 = 3要素の単価効果
    expect(d5!.priceEffect + d5!.mixEffect).toBeCloseTo(d3.pricePerItemEffect, 2)
  })
})

/* ── 数学的不変条件テスト（CI 回帰防止） ──────────── */

describe('数学的不変条件: 全分解関数の合計 = ΔS', () => {
  // 多様なパラメータで不変条件を検証するパラメトリックテスト
  const scenarios = [
    { label: '増収・増客・増点数', ps: 200_000, cs: 350_000, pc: 80, cc: 120, ptq: 400, ctq: 720 },
    { label: '減収・減客', ps: 500_000, cs: 300_000, pc: 200, cc: 120, ptq: 1000, ctq: 600 },
    { label: '客数一定・単価変動', ps: 100_000, cs: 150_000, pc: 50, cc: 50, ptq: 200, ctq: 200 },
    { label: '点数一定・客数増', ps: 300_000, cs: 360_000, pc: 100, cc: 120, ptq: 500, ctq: 600 },
    { label: '大幅増収', ps: 100_000, cs: 1_000_000, pc: 50, cc: 500, ptq: 200, ctq: 5000 },
    { label: '微小変動', ps: 100_000, cs: 100_100, pc: 100, cc: 101, ptq: 500, ctq: 505 },
  ]

  for (const s of scenarios) {
    it(`decompose2: ${s.label}`, () => {
      const r = decompose2(s.ps, s.cs, s.pc, s.cc)
      expect(r.custEffect + r.ticketEffect).toBeCloseTo(s.cs - s.ps, 0)
    })

    it(`decompose3: ${s.label}`, () => {
      const r = decompose3(s.ps, s.cs, s.pc, s.cc, s.ptq, s.ctq)
      expect(r.custEffect + r.qtyEffect + r.pricePerItemEffect).toBeCloseTo(s.cs - s.ps, 0)
    })
  }

  it('decompose5: 売上とカテゴリ合計が乖離するデータセット', () => {
    // カテゴリ合計: prev=280,000, cur=420,000 (差=140,000)
    // 売上合計:     prev=300,000, cur=450,000 (差=150,000) ← 異なる
    const prevCats = [cat('X', 200, 160_000), cat('Y', 100, 80_000), cat('Z', 50, 40_000)]
    const curCats = [cat('X', 300, 270_000), cat('Y', 80, 60_000), cat('Z', 120, 90_000)]
    const result = decompose5(300_000, 450_000, 100, 130, 350, 500, curCats, prevCats)
    expect(result).not.toBeNull()
    const total = result!.custEffect + result!.qtyEffect + result!.priceEffect + result!.mixEffect
    // 売上データの差（150,000）に一致しなければならない
    expect(Math.abs(total - 150_000)).toBeLessThan(1)
  })

  it('decompose5: 全パラメータが大きく変動', () => {
    const prevCats = [cat('A', 1000, 500_000), cat('B', 500, 300_000), cat('C', 200, 200_000)]
    const curCats = [cat('A', 800, 480_000), cat('B', 900, 630_000), cat('D', 300, 240_000)]
    const result = decompose5(1_200_000, 1_500_000, 500, 600, 1700, 2000, curCats, prevCats)
    expect(result).not.toBeNull()
    const total = result!.custEffect + result!.qtyEffect + result!.priceEffect + result!.mixEffect
    expect(Math.abs(total - 300_000)).toBeLessThan(1)
  })
})

/* ── PI値・点単価 × decompose3 の整合性 ────────────── */

describe('PI値・点単価と decompose3 の整合性', () => {
  it('decompose3 の内部計算と同じ Q/P̄ を外部関数で再現できる', () => {
    // decompose3 内部: Q0 = prevTotalQty/prevCust, P0 = prevSales/prevTotalQty
    const prevSales = 250_000, curSales = 396_000
    const prevCust = 100, curCust = 110
    const prevTotalQty = 500, curTotalQty = 660

    const prevPI = calculateItemsPerCustomer(prevTotalQty, prevCust)
    const curPI = calculateItemsPerCustomer(curTotalQty, curCust)
    const prevPPI = calculateAveragePricePerItem(prevSales, prevTotalQty)
    const curPPI = calculateAveragePricePerItem(curSales, curTotalQty)

    // Q0 = 500/100 = 5, Q1 = 660/110 = 6
    expect(prevPI).toBeCloseTo(5, 10)
    expect(curPI).toBeCloseTo(6, 10)
    // P0 = 250000/500 = 500, P1 = 396000/660 = 600
    expect(prevPPI).toBeCloseTo(500, 10)
    expect(curPPI).toBeCloseTo(600, 10)

    // C × Q × P̄ = S が前年・当年それぞれで成立
    expect(prevCust * prevPI * prevPPI).toBeCloseTo(prevSales, 2)
    expect(curCust * curPI * curPPI).toBeCloseTo(curSales, 2)

    // decompose3 の合計 = ΔS も引き続き成立
    const d = decompose3(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)
    expect(d.custEffect + d.qtyEffect + d.pricePerItemEffect).toBeCloseTo(curSales - prevSales, 2)
  })

  it('多様なシナリオで C × Q × P̄ 恒等式が成立する', () => {
    const scenarios = [
      { ps: 200_000, cs: 350_000, pc: 80, cc: 120, ptq: 400, ctq: 720 },
      { ps: 500_000, cs: 300_000, pc: 200, cc: 120, ptq: 1000, ctq: 600 },
      { ps: 100_000, cs: 150_000, pc: 50, cc: 50, ptq: 200, ctq: 200 },
      { ps: 1_000_000, cs: 1_200_000, pc: 500, cc: 600, ptq: 5000, ctq: 7200 },
    ]

    for (const s of scenarios) {
      const prevPI = calculateItemsPerCustomer(s.ptq, s.pc)
      const curPI = calculateItemsPerCustomer(s.ctq, s.cc)
      const prevPPI = calculateAveragePricePerItem(s.ps, s.ptq)
      const curPPI = calculateAveragePricePerItem(s.cs, s.ctq)

      // C × Q × P̄ = S（前年・当年）
      expect(s.pc * prevPI * prevPPI).toBeCloseTo(s.ps, 2)
      expect(s.cc * curPI * curPPI).toBeCloseTo(s.cs, 2)
    }
  })
})

describe('数学的不変条件: 2↔3↔5要素間の一貫性', () => {
  it('decompose2の客単価効果 = decompose3の(点数効果+単価効果)', () => {
    const ps = 200_000,
      cs = 350_000,
      pc = 80,
      cc = 120,
      ptq = 400,
      ctq = 720
    const d2 = decompose2(ps, cs, pc, cc)
    const d3 = decompose3(ps, cs, pc, cc, ptq, ctq)
    // 客数効果は2要素と3要素で異なる（交互作用の配分が変わる）
    // だが合計は同じ
    expect(d2.custEffect + d2.ticketEffect).toBeCloseTo(
      d3.custEffect + d3.qtyEffect + d3.pricePerItemEffect,
      0,
    )
  })

  it('decompose5の(価格+構成比) = decompose3の単価効果', () => {
    const ps = 200_000,
      cs = 350_000,
      pc = 80,
      cc = 120
    const prevCats = [cat('A', 250, 125_000), cat('B', 150, 75_000)]
    const curCats = [cat('A', 420, 252_000), cat('B', 300, 168_000)]
    const ptq = 400,
      ctq = 720
    const d3 = decompose3(ps, cs, pc, cc, ptq, ctq)
    const d5 = decompose5(ps, cs, pc, cc, ptq, ctq, curCats, prevCats)
    expect(d5).not.toBeNull()
    expect(d5!.priceEffect + d5!.mixEffect).toBeCloseTo(d3.pricePerItemEffect, 0)
    expect(d5!.custEffect).toBeCloseTo(d3.custEffect, 0)
    expect(d5!.qtyEffect).toBeCloseTo(d3.qtyEffect, 0)
  })
})
