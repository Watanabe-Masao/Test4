/**
 * factorDecomposition Bridge テスト
 *
 * WASM は vitest (jsdom/node) 環境では利用不可のため、以下を検証:
 * 1. ts-only モード: TS 実装が正しく呼ばれる
 * 2. WASM 未初期化時のフォールバック: wasm-only モードでも TS に戻る
 * 3. decomposePriceMix の TS 順序安定性
 * 4. bridge 関数と TS 直接呼び出しの結果一致
 *
 * TS/WASM 間の数値比較は Rust golden fixture (cargo test) + E2E で検証する。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { decompose2, decompose3, decompose5, decomposePriceMix } from '../factorDecompositionBridge'
import {
  decompose2 as decompose2Direct,
  decompose3 as decompose3Direct,
  decompose5 as decompose5Direct,
  decomposePriceMix as decomposePriceMixDirect,
} from '@/domain/calculations/factorDecomposition'
import type { CategoryQtyAmt } from '@/domain/calculations/factorDecomposition'
import { setExecutionMode } from '../wasmEngine'

function cat(key: string, qty: number, amt: number): CategoryQtyAmt {
  return { key, qty, amt }
}

beforeEach(() => {
  setExecutionMode('ts-only')
})

describe('bridge ts-only mode: bridge と直接呼び出しの結果一致', () => {
  it('decompose2', () => {
    const bridge = decompose2(100_000, 132_000, 100, 110)
    const direct = decompose2Direct(100_000, 132_000, 100, 110)
    expect(bridge.custEffect).toBe(direct.custEffect)
    expect(bridge.ticketEffect).toBe(direct.ticketEffect)
  })

  it('decompose3', () => {
    const bridge = decompose3(250_000, 396_000, 100, 110, 500, 660)
    const direct = decompose3Direct(250_000, 396_000, 100, 110, 500, 660)
    expect(bridge.custEffect).toBe(direct.custEffect)
    expect(bridge.qtyEffect).toBe(direct.qtyEffect)
    expect(bridge.pricePerItemEffect).toBe(direct.pricePerItemEffect)
  })

  it('decomposePriceMix', () => {
    const prev = [cat('A', 100, 100_000), cat('B', 100, 50_000)]
    const cur = [cat('A', 100, 110_000), cat('B', 100, 50_000)]
    const bridge = decomposePriceMix(cur, prev)
    const direct = decomposePriceMixDirect(cur, prev)
    expect(bridge).toEqual(direct)
  })

  it('decomposePriceMix null', () => {
    expect(decomposePriceMix([], [])).toBeNull()
  })

  it('decompose5', () => {
    const prevCats = [cat('A', 300, 240_000), cat('B', 200, 80_000)]
    const curCats = [cat('A', 400, 360_000), cat('B', 260, 117_000)]
    const bridge = decompose5(320_000, 477_000, 100, 110, 500, 660, curCats, prevCats)
    const direct = decompose5Direct(320_000, 477_000, 100, 110, 500, 660, curCats, prevCats)
    expect(bridge).toEqual(direct)
  })

  it('decompose5 null', () => {
    expect(decompose5(100_000, 120_000, 100, 110, 500, 600, [], [])).toBeNull()
  })
})

describe('bridge wasm-only mode: WASM 未初期化時は TS フォールバック', () => {
  it('decompose2 falls back to TS when WASM not ready', () => {
    setExecutionMode('wasm-only')
    const bridge = decompose2(100_000, 132_000, 100, 110)
    const direct = decompose2Direct(100_000, 132_000, 100, 110)
    // WASM is not initialized in test env → should fallback to TS
    expect(bridge.custEffect).toBe(direct.custEffect)
    expect(bridge.ticketEffect).toBe(direct.ticketEffect)
  })

  it('decompose3 falls back to TS when WASM not ready', () => {
    setExecutionMode('wasm-only')
    const bridge = decompose3(250_000, 396_000, 100, 110, 500, 660)
    const direct = decompose3Direct(250_000, 396_000, 100, 110, 500, 660)
    expect(bridge.custEffect).toBe(direct.custEffect)
  })

  it('decompose5 falls back to TS when WASM not ready', () => {
    setExecutionMode('wasm-only')
    const prevCats = [cat('A', 300, 240_000), cat('B', 200, 80_000)]
    const curCats = [cat('A', 400, 360_000), cat('B', 260, 117_000)]
    const bridge = decompose5(320_000, 477_000, 100, 110, 500, 660, curCats, prevCats)
    const direct = decompose5Direct(320_000, 477_000, 100, 110, 500, 660, curCats, prevCats)
    expect(bridge).toEqual(direct)
  })
})

describe('decomposePriceMix TS 順序安定性', () => {
  const prev = [cat('A', 100, 100_000), cat('B', 80, 48_000), cat('C', 120, 36_000)]
  const cur = [cat('A', 110, 121_000), cat('B', 90, 58_500), cat('C', 100, 35_000)]

  it('入力順序をシャッフルしても結果が一致', () => {
    const r1 = decomposePriceMix(cur, prev)
    expect(r1).not.toBeNull()

    // Reversed
    const r2 = decomposePriceMix([...cur].reverse(), [...prev].reverse())
    expect(r2).not.toBeNull()
    expect(r2!.priceEffect).toBeCloseTo(r1!.priceEffect, 10)
    expect(r2!.mixEffect).toBeCloseTo(r1!.mixEffect, 10)

    // Different shuffle: [C, A, B]
    const r3 = decomposePriceMix([cur[2], cur[0], cur[1]], [prev[2], prev[0], prev[1]])
    expect(r3).not.toBeNull()
    expect(r3!.priceEffect).toBeCloseTo(r1!.priceEffect, 10)
    expect(r3!.mixEffect).toBeCloseTo(r1!.mixEffect, 10)
  })

  it('新規/消滅カテゴリの順序変更でも一致', () => {
    const prev1 = [cat('A', 100, 50_000), cat('B', 100, 100_000)]
    const cur1 = [cat('A', 100, 50_000), cat('C', 100, 80_000)]

    const r1 = decomposePriceMix(cur1, prev1)
    const r2 = decomposePriceMix([...cur1].reverse(), [...prev1].reverse())

    expect(r1).not.toBeNull()
    expect(r2).not.toBeNull()
    expect(r2!.priceEffect).toBeCloseTo(r1!.priceEffect, 10)
    expect(r2!.mixEffect).toBeCloseTo(r1!.mixEffect, 10)
  })
})

describe('Shapley 恒等式: bridge 経由でも成立', () => {
  const scenarios = [
    { ps: 200_000, cs: 350_000, pc: 80, cc: 120, ptq: 400, ctq: 720 },
    { ps: 500_000, cs: 300_000, pc: 200, cc: 120, ptq: 1000, ctq: 600 },
    { ps: 100_000, cs: 150_000, pc: 50, cc: 50, ptq: 200, ctq: 200 },
    { ps: 100_000, cs: 1_000_000, pc: 50, cc: 500, ptq: 200, ctq: 5000 },
    { ps: 100_000, cs: 100_100, pc: 100, cc: 101, ptq: 500, ctq: 505 },
  ]

  for (const s of scenarios) {
    it(`decompose2: ps=${s.ps}, cs=${s.cs}`, () => {
      const r = decompose2(s.ps, s.cs, s.pc, s.cc)
      expect(r.custEffect + r.ticketEffect).toBeCloseTo(s.cs - s.ps, 0)
    })

    it(`decompose3: ps=${s.ps}, cs=${s.cs}`, () => {
      const r = decompose3(s.ps, s.cs, s.pc, s.cc, s.ptq, s.ctq)
      expect(r.custEffect + r.qtyEffect + r.pricePerItemEffect).toBeCloseTo(s.cs - s.ps, 0)
    })
  }
})
