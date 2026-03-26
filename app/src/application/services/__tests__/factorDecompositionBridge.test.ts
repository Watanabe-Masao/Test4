/**
 * factorDecomposition Bridge テスト
 *
 * 検証項目:
 * 1. ts-only モード: TS 実装が正しく呼ばれる
 * 2. wasm-only + WASM 未初期化: TS フォールバック
 * 3. wasm-only + state=loading: TS フォールバック
 * 4. dual-run-compare + WASM 未初期化: TS フォールバック
 * 5. dual-run-compare + WASM ready + 不一致: console.warn + DualRunMismatchLog shape
 * 6. dual-run-compare + WASM ready + 一致: console.warn なし
 * 7. decomposePriceMix の TS 順序安定性
 * 8. Shapley 恒等式: bridge 経由でも成立
 *
 * TS/WASM 間の数値比較は Rust golden fixture (cargo test) + E2E で検証する。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  decompose2 as decompose2Direct,
  decompose3 as decompose3Direct,
  decompose5 as decompose5Direct,
  decomposePriceMix as decomposePriceMixDirect,
} from '@/domain/calculations/factorDecomposition'
import type { CategoryQtyAmt } from '@/domain/calculations/factorDecomposition'
import { setExecutionMode } from '../wasmEngine'
import * as wasmEngine from '../wasmEngine'

/**
 * vi.mock はファイルトップにホイストされる。
 * WASM wrapper をモックし、dual-run compare テストで使用する。
 * ts-only / wasm-only(idle) モードでは WASM wrapper は呼ばれないため、
 * 既存テストに影響しない。
 */
vi.mock('../factorDecompositionWasm', () => ({
  decompose2Wasm: vi.fn(() => ({
    custEffect: 99999,
    ticketEffect: 99999,
  })),
  decompose3Wasm: vi.fn(() => ({
    custEffect: 99999,
    qtyEffect: 99999,
    pricePerItemEffect: 99999,
  })),
  decomposePriceMixWasm: vi.fn(() => ({
    priceEffect: 99999,
    mixEffect: 99999,
  })),
  decompose5Wasm: vi.fn(() => ({
    custEffect: 99999,
    qtyEffect: 99999,
    priceEffect: 99999,
    mixEffect: 99999,
  })),
}))

// bridge は vi.mock の後に import する（ホイスト後に解決されるため実際の順序は問題ない）
import { decompose2, decompose3, decompose5, decomposePriceMix } from '../factorDecompositionBridge'
import { decompose2Wasm, decomposePriceMixWasm } from '../factorDecompositionWasm'

function cat(key: string, qty: number, amt: number): CategoryQtyAmt {
  return { key, qty, amt }
}

beforeEach(() => {
  setExecutionMode('ts-only')
  vi.restoreAllMocks()
})

/* ── 1. ts-only モード ─────────────────────────── */

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

/* ── 2. wasm-only + WASM 未初期化 (idle) ──────── */

describe('bridge wasm-only mode: WASM 未初期化時は TS フォールバック', () => {
  it('decompose2 falls back to TS when WASM not ready', () => {
    setExecutionMode('wasm-only')
    const bridge = decompose2(100_000, 132_000, 100, 110)
    const direct = decompose2Direct(100_000, 132_000, 100, 110)
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

/* ── 3. wasm-only + state=loading ─────────────── */

describe('wasm-only + state=loading: TS フォールバック', () => {
  it('loading 中は TS にフォールバック', () => {
    setExecutionMode('wasm-only')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('loading')
    const bridge = decompose3(250_000, 396_000, 100, 110, 500, 660)
    const direct = decompose3Direct(250_000, 396_000, 100, 110, 500, 660)
    expect(bridge.custEffect).toBe(direct.custEffect)
    expect(bridge.qtyEffect).toBe(direct.qtyEffect)
    expect(bridge.pricePerItemEffect).toBe(direct.pricePerItemEffect)
  })

  it('error 状態でも TS にフォールバック', () => {
    setExecutionMode('wasm-only')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('error')
    const bridge = decompose2(100_000, 132_000, 100, 110)
    const direct = decompose2Direct(100_000, 132_000, 100, 110)
    expect(bridge.custEffect).toBe(direct.custEffect)
    expect(bridge.ticketEffect).toBe(direct.ticketEffect)
  })
})

/* ── 4. dual-run-compare + WASM 未初期化 ─────── */

describe('dual-run-compare + WASM idle: TS フォールバック（compare なし）', () => {
  it('WASM 未初期化時は TS 結果のみ、compare は発生しない', () => {
    setExecutionMode('dual-run-compare')
    const spy = vi.spyOn(console, 'warn')
    const bridge = decompose2(100_000, 132_000, 100, 110)
    const direct = decompose2Direct(100_000, 132_000, 100, 110)
    expect(bridge.custEffect).toBe(direct.custEffect)
    expect(bridge.ticketEffect).toBe(direct.ticketEffect)
    // WASM not ready → isDualRun() = false → compare not triggered
    expect(spy).not.toHaveBeenCalled()
  })
})

/* ── 5. DualRunMismatchLog shape（モック WASM で差分検出）── */

describe('DualRunMismatchLog shape（モック WASM で差分検出）', () => {
  beforeEach(() => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
  })

  it('decompose2: 不一致時に console.warn + 正しい log shape', () => {
    const spy = vi.spyOn(console, 'warn')
    const result = decompose2(100_000, 132_000, 100, 110)

    // TS 結果を返すこと（authoritative は TS）
    const direct = decompose2Direct(100_000, 132_000, 100, 110)
    expect(result.custEffect).toBe(direct.custEffect)

    // mismatch log が出力されること
    expect(spy).toHaveBeenCalledTimes(1)
    const [label, log] = spy.mock.calls[0]
    expect(label).toBe('[factorDecomposition dual-run mismatch]')

    // DualRunMismatchLog shape 検証
    expect(log).toMatchObject({
      function: 'decompose2',
      inputSummary: { prevSales: 100_000, curSales: 132_000 },
      tsResult: { custEffect: direct.custEffect, ticketEffect: direct.ticketEffect },
      wasmResult: { custEffect: 99999, ticketEffect: 99999 },
      wasmState: 'ready',
      executionMode: 'dual-run-compare',
    })
    expect(typeof log.maxAbsDiff).toBe('number')
    expect(log.maxAbsDiff).toBeGreaterThan(0)
    expect(log.diffs).toBeDefined()
    expect(log.sumInvariantTs).toBe('ok')
    expect(log.sumInvariantWasm).toBe('violated')
  })

  it('decompose3: 不一致時に mismatch log の正しいフィールド', () => {
    const spy = vi.spyOn(console, 'warn')
    decompose3(250_000, 396_000, 100, 110, 500, 660)

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('decompose3')
    expect(log.tsResult).toHaveProperty('custEffect')
    expect(log.tsResult).toHaveProperty('qtyEffect')
    expect(log.tsResult).toHaveProperty('pricePerItemEffect')
    expect(log.wasmResult).toEqual({
      custEffect: 99999,
      qtyEffect: 99999,
      pricePerItemEffect: 99999,
    })
  })

  it('decomposePriceMix: 不一致時に mismatch log', () => {
    const spy = vi.spyOn(console, 'warn')
    const prev = [cat('A', 100, 100_000), cat('B', 100, 50_000)]
    const cur = [cat('A', 100, 110_000), cat('B', 100, 50_000)]
    decomposePriceMix(cur, prev)

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('decomposePriceMix')
    expect(log.wasmResult).toEqual({ priceEffect: 99999, mixEffect: 99999 })
  })

  it('decompose5: 不一致時に mismatch log', () => {
    const spy = vi.spyOn(console, 'warn')
    const prevCats = [cat('A', 300, 240_000), cat('B', 200, 80_000)]
    const curCats = [cat('A', 400, 360_000), cat('B', 260, 117_000)]
    decompose5(320_000, 477_000, 100, 110, 500, 660, curCats, prevCats)

    expect(spy).toHaveBeenCalledTimes(1)
    const [, log] = spy.mock.calls[0]
    expect(log.function).toBe('decompose5')
    expect(log.wasmResult).toEqual({
      custEffect: 99999,
      qtyEffect: 99999,
      priceEffect: 99999,
      mixEffect: 99999,
    })
  })

  it('decompose5: TS=null / WASM=non-null の null mismatch を検出', () => {
    const spy = vi.spyOn(console, 'warn')
    // 空カテゴリ → TS は null を返す。モック WASM は常に non-null
    decompose5(100_000, 120_000, 100, 110, 500, 600, [], [])

    expect(spy).toHaveBeenCalledTimes(1)
    const [label] = spy.mock.calls[0]
    expect(label).toBe('[factorDecomposition dual-run null mismatch] decompose5:')
  })
})

/* ── 6. dual-run-compare + 一致時は silent ────── */

describe('dual-run-compare + WASM 一致時は console.warn しない', () => {
  it('decompose2: TS と WASM が一致すれば warn なし', () => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')

    // WASM モックを TS と同じ結果を返すように差し替え
    const direct = decompose2Direct(100_000, 132_000, 100, 110)
    vi.mocked(decompose2Wasm).mockReturnValueOnce({
      custEffect: direct.custEffect,
      ticketEffect: direct.ticketEffect,
    })

    const spy = vi.spyOn(console, 'warn')
    const result = decompose2(100_000, 132_000, 100, 110)

    expect(result.custEffect).toBe(direct.custEffect)
    expect(result.ticketEffect).toBe(direct.ticketEffect)
    expect(spy).not.toHaveBeenCalled()
  })

  it('decomposePriceMix: 両方 null なら warn なし', () => {
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.mocked(decomposePriceMixWasm).mockReturnValueOnce(null)

    const spy = vi.spyOn(console, 'warn')
    const result = decomposePriceMix([], [])

    expect(result).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})

/* ── 7. decomposePriceMix TS 順序安定性 ────────── */

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

/* ── 8. Shapley 恒等式: bridge 経由でも成立 ───── */

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
