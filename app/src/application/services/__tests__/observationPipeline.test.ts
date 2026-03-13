/**
 * 観測パイプライン統合テスト（Phase 5C-3）
 *
 * 目的:
 * - 10 call path × 4 データ条件で bridge → observer の蓄積パイプラインを検証
 * - Shapley 恒等式が全条件で成立することを確認
 * - observer の分類（verdict）が正しく動作することを確認
 * - 手動ブラウザ観測の前に、自動化可能な部分を網羅する
 *
 * 制約:
 * - テスト環境では WASM は mock。実 WASM の検証はブラウザ観測で行う
 * - このテストは TS 実装の正しさ（bridge 経由）を 4 条件で保証する
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  decompose2 as decompose2TS,
  decompose3 as decompose3TS,
  decompose5 as decompose5TS,
  decomposePriceMix as decomposePriceMixTS,
} from '@/domain/calculations/factorDecomposition'
import type { CategoryQtyAmt } from '@/domain/calculations/factorDecomposition'
import { setExecutionMode } from '../wasmEngine'
import * as wasmEngine from '../wasmEngine'
import { dualRunStatsHandler } from '../dualRunObserver'

/* ── WASM mock: 初期状態は passthrough（beforeEach で設定） ── */

vi.mock('../factorDecompositionWasm', () => ({
  decompose2Wasm: vi.fn(),
  decompose3Wasm: vi.fn(),
  decomposePriceMixWasm: vi.fn(),
  decompose5Wasm: vi.fn(),
}))

import { decompose2, decompose3, decompose5, decomposePriceMix } from '../factorDecompositionBridge'
import {
  decompose2Wasm,
  decompose3Wasm,
  decompose5Wasm,
  decomposePriceMixWasm,
} from '../factorDecompositionWasm'

function cat(key: string, qty: number, amt: number): CategoryQtyAmt {
  return { key, qty, amt }
}

/* ── データ条件定義 ── */

/** 条件1: 通常ケース */
const NORMAL = {
  prevSales: 200_000,
  curSales: 280_000,
  prevCust: 100,
  curCust: 120,
  prevQty: 500,
  curQty: 600,
  prevCats: [cat('食品', 300, 150_000), cat('日用品', 200, 50_000)],
  curCats: [cat('食品', 360, 200_000), cat('日用品', 240, 80_000)],
}

/** 条件2: カテゴリ新規/消滅 */
const CATEGORY_CHANGE = {
  prevSales: 150_000,
  curSales: 180_000,
  prevCust: 80,
  curCust: 90,
  prevQty: 400,
  curQty: 480,
  prevCats: [cat('食品', 300, 120_000), cat('酒類', 100, 30_000)],
  curCats: [cat('食品', 360, 150_000), cat('新商品', 120, 30_000)],
}

/** 条件3: 価格/構成比大変動 */
const PRICE_SHOCK = {
  prevSales: 500_000,
  curSales: 800_000,
  prevCust: 200,
  curCust: 200,
  prevQty: 1000,
  curQty: 1000,
  prevCats: [cat('A', 800, 400_000), cat('B', 200, 100_000)],
  curCats: [cat('A', 400, 400_000), cat('B', 600, 400_000)],
}

/** 条件4: 時系列（複数日分） */
const TIME_SERIES_DAYS = [
  { prevSales: 100_000, curSales: 110_000, prevCust: 50, curCust: 55 },
  { prevSales: 120_000, curSales: 108_000, prevCust: 60, curCust: 54 },
  { prevSales: 90_000, curSales: 135_000, prevCust: 45, curCust: 67 },
  { prevSales: 110_000, curSales: 99_000, prevCust: 55, curCust: 45 },
  { prevSales: 130_000, curSales: 156_000, prevCust: 65, curCust: 78 },
]

type ObservationSummary = {
  totalCalls: number
  totalMismatches: number
  totalNullMismatches: number
  totalInvariantViolations: number
  globalMaxAbsDiff: number
  byFunction: Record<string, { calls: number; mismatches: number }>
  verdict: string
}

/* ── テスト本体 ── */

describe('観測パイプライン統合テスト', () => {
  beforeEach(() => {
    dualRunStatsHandler('reset')
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmState').mockReturnValue('ready')
    vi.spyOn(console, 'warn')

    // WASM mock を TS と同じ結果を返すように設定（clean 検証用）
    vi.mocked(decompose2Wasm).mockImplementation(
      (ps, cs, pc, cc) => decompose2TS(ps, cs, pc, cc),
    )
    vi.mocked(decompose3Wasm).mockImplementation(
      (ps, cs, pc, cc, ptq, ctq) => decompose3TS(ps, cs, pc, cc, ptq, ctq),
    )
    vi.mocked(decompose5Wasm).mockImplementation(
      (ps, cs, pc, cc, ptq, ctq, cur, prev) =>
        decompose5TS(ps, cs, pc, cc, ptq, ctq, cur, prev),
    )
    vi.mocked(decomposePriceMixWasm).mockImplementation(
      (cur, prev) => decomposePriceMixTS(cur, prev),
    )
  })

  describe('条件1: 通常ケース — 全関数で Shapley 恒等式が成立', () => {
    it('decompose2: custEffect + ticketEffect = salesDiff', () => {
      const d = NORMAL
      const r = decompose2(d.prevSales, d.curSales, d.prevCust, d.curCust)
      expect(r.custEffect + r.ticketEffect).toBeCloseTo(d.curSales - d.prevSales, 0)
    })

    it('decompose3: custEffect + qtyEffect + pricePerItemEffect = salesDiff', () => {
      const d = NORMAL
      const r = decompose3(d.prevSales, d.curSales, d.prevCust, d.curCust, d.prevQty, d.curQty)
      expect(r.custEffect + r.qtyEffect + r.pricePerItemEffect).toBeCloseTo(
        d.curSales - d.prevSales,
        0,
      )
    })

    it('decompose5: 4要因合計 = salesDiff', () => {
      const d = NORMAL
      const r = decompose5(
        d.prevSales, d.curSales, d.prevCust, d.curCust,
        d.prevQty, d.curQty, d.curCats, d.prevCats,
      )
      expect(r).not.toBeNull()
      expect(
        r!.custEffect + r!.qtyEffect + r!.priceEffect + r!.mixEffect,
      ).toBeCloseTo(d.curSales - d.prevSales, 0)
    })

    it('decomposePriceMix: non-null', () => {
      const d = NORMAL
      const r = decomposePriceMix(d.curCats, d.prevCats)
      expect(r).not.toBeNull()
    })

    it('observer: clean verdict（WASM mock = TS）', () => {
      const d = NORMAL
      decompose2(d.prevSales, d.curSales, d.prevCust, d.curCust)
      decompose3(d.prevSales, d.curSales, d.prevCust, d.curCust, d.prevQty, d.curQty)
      decompose5(
        d.prevSales, d.curSales, d.prevCust, d.curCust,
        d.prevQty, d.curQty, d.curCats, d.prevCats,
      )
      decomposePriceMix(d.curCats, d.prevCats)

      const s = dualRunStatsHandler() as ObservationSummary
      expect(s.totalCalls).toBe(4)
      expect(s.totalMismatches).toBe(0)
      expect(s.verdict).toBe('clean')
    })
  })

  describe('条件2: カテゴリ新規/消滅 — null 判定と恒等式の両立', () => {
    it('decompose5: 新規/消滅カテゴリありでも非null', () => {
      const d = CATEGORY_CHANGE
      const r = decompose5(
        d.prevSales, d.curSales, d.prevCust, d.curCust,
        d.prevQty, d.curQty, d.curCats, d.prevCats,
      )
      expect(r).not.toBeNull()
      expect(
        r!.custEffect + r!.qtyEffect + r!.priceEffect + r!.mixEffect,
      ).toBeCloseTo(d.curSales - d.prevSales, 0)
    })

    it('decomposePriceMix: 新規/消滅カテゴリあり', () => {
      const d = CATEGORY_CHANGE
      const r = decomposePriceMix(d.curCats, d.prevCats)
      expect(r).not.toBeNull()
    })

    it('空カテゴリ → null を返す', () => {
      const r = decompose5(100_000, 120_000, 50, 60, 200, 240, [], [])
      expect(r).toBeNull()
    })
  })

  describe('条件3: 価格/構成比大変動 — 数値安定性', () => {
    it('decompose5: 構成比逆転でも恒等式成立', () => {
      const d = PRICE_SHOCK
      const r = decompose5(
        d.prevSales, d.curSales, d.prevCust, d.curCust,
        d.prevQty, d.curQty, d.curCats, d.prevCats,
      )
      expect(r).not.toBeNull()
      expect(
        r!.custEffect + r!.qtyEffect + r!.priceEffect + r!.mixEffect,
      ).toBeCloseTo(d.curSales - d.prevSales, 0)
    })

    it('decomposePriceMix: 構成比大変動でも安定', () => {
      const d = PRICE_SHOCK
      const r = decomposePriceMix(d.curCats, d.prevCats)
      expect(r).not.toBeNull()
      expect(r!.priceEffect + r!.mixEffect).toBeCloseTo(
        decompose3TS(d.prevSales, d.curSales, d.prevCust, d.curCust, d.prevQty, d.curQty)
          .pricePerItemEffect,
        0,
      )
    })

    it('decompose2: 客数同一 → custEffect ≈ 0', () => {
      const d = PRICE_SHOCK
      const r = decompose2(d.prevSales, d.curSales, d.prevCust, d.curCust)
      expect(r.custEffect).toBeCloseTo(0, 0)
      expect(r.ticketEffect).toBeCloseTo(d.curSales - d.prevSales, 0)
    })
  })

  describe('条件4: 時系列比較 — ループ内蓄積の一貫性', () => {
    it('useShapleyTimeSeries パターン: 日次 decompose2 の累積が全体差に近似', () => {
      let cumCust = 0
      let cumTicket = 0

      for (const day of TIME_SERIES_DAYS) {
        const r = decompose2(day.prevSales, day.curSales, day.prevCust, day.curCust)
        cumCust += r.custEffect
        cumTicket += r.ticketEffect

        // 各日で恒等式成立
        expect(r.custEffect + r.ticketEffect).toBeCloseTo(
          day.curSales - day.prevSales,
          0,
        )
      }

      // 累積合計 = 全日の売上差合計
      const totalDiff = TIME_SERIES_DAYS.reduce(
        (acc, d) => acc + (d.curSales - d.prevSales),
        0,
      )
      expect(cumCust + cumTicket).toBeCloseTo(totalDiff, 0)
    })

    it('observer: 時系列ループで呼出回数が正しく蓄積', () => {
      for (const day of TIME_SERIES_DAYS) {
        decompose2(day.prevSales, day.curSales, day.prevCust, day.curCust)
      }

      const s = dualRunStatsHandler() as ObservationSummary
      expect(s.totalCalls).toBe(TIME_SERIES_DAYS.length)
      expect(s.byFunction.decompose2.calls).toBe(TIME_SERIES_DAYS.length)
      expect(s.verdict).toBe('clean')
    })
  })

  describe('全条件横断: observer 蓄積サマリ', () => {
    it('4条件 × 全関数実行後の observer が clean', () => {
      const conditions = [NORMAL, CATEGORY_CHANGE, PRICE_SHOCK]

      for (const d of conditions) {
        decompose2(d.prevSales, d.curSales, d.prevCust, d.curCust)
        decompose3(d.prevSales, d.curSales, d.prevCust, d.curCust, d.prevQty, d.curQty)
        decompose5(
          d.prevSales, d.curSales, d.prevCust, d.curCust,
          d.prevQty, d.curQty, d.curCats, d.prevCats,
        )
        decomposePriceMix(d.curCats, d.prevCats)
      }

      // 時系列条件
      for (const day of TIME_SERIES_DAYS) {
        decompose2(day.prevSales, day.curSales, day.prevCust, day.curCust)
      }

      const s = dualRunStatsHandler() as ObservationSummary

      // 3条件 × 4関数 + 5日分 = 17 calls
      expect(s.totalCalls).toBe(3 * 4 + TIME_SERIES_DAYS.length)

      // WASM mock = TS → mismatch ゼロ
      expect(s.totalMismatches).toBe(0)
      expect(s.totalNullMismatches).toBe(0)
      expect(s.totalInvariantViolations).toBe(0)
      expect(s.verdict).toBe('clean')

      // 各関数が呼ばれている
      expect(s.byFunction.decompose2.calls).toBe(3 + TIME_SERIES_DAYS.length)
      expect(s.byFunction.decompose3.calls).toBe(3)
      expect(s.byFunction.decompose5.calls).toBe(3)
      expect(s.byFunction.decomposePriceMix.calls).toBe(3)
    })
  })

  describe('bridge 経由の TS 結果と直接呼出の一致（全条件）', () => {
    const conditions = [
      { name: '通常', data: NORMAL },
      { name: 'カテゴリ変動', data: CATEGORY_CHANGE },
      { name: '価格大変動', data: PRICE_SHOCK },
    ]

    for (const { name, data: d } of conditions) {
      it(`${name}: decompose2 bridge = direct`, () => {
        const bridge = decompose2(d.prevSales, d.curSales, d.prevCust, d.curCust)
        const direct = decompose2TS(d.prevSales, d.curSales, d.prevCust, d.curCust)
        expect(bridge).toEqual(direct)
      })

      it(`${name}: decompose3 bridge = direct`, () => {
        const bridge = decompose3(
          d.prevSales, d.curSales, d.prevCust, d.curCust, d.prevQty, d.curQty,
        )
        const direct = decompose3TS(
          d.prevSales, d.curSales, d.prevCust, d.curCust, d.prevQty, d.curQty,
        )
        expect(bridge).toEqual(direct)
      })

      it(`${name}: decompose5 bridge = direct`, () => {
        const bridge = decompose5(
          d.prevSales, d.curSales, d.prevCust, d.curCust,
          d.prevQty, d.curQty, d.curCats, d.prevCats,
        )
        const direct = decompose5TS(
          d.prevSales, d.curSales, d.prevCust, d.curCust,
          d.prevQty, d.curQty, d.curCats, d.prevCats,
        )
        expect(bridge).toEqual(direct)
      })

      it(`${name}: decomposePriceMix bridge = direct`, () => {
        const bridge = decomposePriceMix(d.curCats, d.prevCats)
        const direct = decomposePriceMixTS(d.curCats, d.prevCats)
        expect(bridge).toEqual(direct)
      })
    }
  })
})
