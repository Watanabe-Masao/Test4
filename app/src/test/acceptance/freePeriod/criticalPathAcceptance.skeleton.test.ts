/**
 * Critical Path Acceptance Suite — 骨格 (PR 0 相当)
 *
 * 役割: 固定期間 preset と自由期間 frame が **同じ内部レーン** を通ることを
 * エンドツーエンドに近い粒度で検証する受け入れテスト層の骨格。
 *
 * スコープ: Phase 0.5 段階では「frame / rows / summary / provenance /
 * fallback の 5 項目を固定で比較する構造」と「preset / free-period 入力の
 * parity を確認する構造」のみを用意する。実 DuckDB は使わず、
 * `goldenDataset.ts` の pure JS fixture + `computeFreePeriodSummary` /
 * `buildFreePeriodReadModel` / `buildFreePeriodFrame` を組み合わせて parity を
 * 検証する。PR 1〜5 の進行に合わせて期待値と assertion を拡張していく。
 *
 * 参照:
 *   - `projects/completed/unify-period-analysis/acceptance-suite.md`
 *   - `projects/completed/unify-period-analysis/test-plan.md` §L2 受け入れテスト
 *   - `projects/completed/unify-period-analysis/checklist.md` Phase 0.5
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  computeFreePeriodSummary,
  buildFreePeriodReadModel,
} from '@/application/readModels/freePeriod/readFreePeriodFact'
import type { FreePeriodReadModel } from '@/application/readModels/freePeriod/FreePeriodTypes'
import { buildFreePeriodFrame } from '@/domain/models/buildFreePeriodFrame'
import type { FreePeriodAnalysisFrame } from '@/domain/models/AnalysisFrame'
import {
  GOLDEN_STORE_IDS,
  GOLDEN_STORE_SUBSET_IDS,
  GOLDEN_CURRENT_RANGE,
  GOLDEN_PREV_MONTH_RANGE,
  GOLDEN_SELECTION_NO_COMPARISON,
  GOLDEN_SELECTION_VS_PREV_MONTH,
  GOLDEN_SELECTION_VS_PREV_YEAR,
  GOLDEN_SELECTION_MONTH_BOUNDARY,
  GOLDEN_CURRENT_ROWS,
  GOLDEN_PREV_YEAR_ROWS,
  GOLDEN_PREV_MONTH_ROWS,
  GOLDEN_MONTH_BOUNDARY_ROWS,
  GOLDEN_STORE_SUBSET_ROWS,
} from '@/test/fixtures/freePeriod/goldenDataset'

/**
 * Acceptance case の入力と期待値の型。
 *
 * 5 項目:
 *   - frame: preset / manual から生成された frame
 *   - currentRows / comparisonRows: 取得行
 *   - currentSummary / comparisonSummary: 集計結果
 *   - provenance: comparison 由来情報（Phase 2 以降で拡充）
 *   - fallback: fallback 有無 + metadata（Phase 3 以降で拡充）
 */
interface AcceptanceCase {
  readonly id: string
  readonly description: string
  readonly frame: FreePeriodAnalysisFrame
  readonly readModel: FreePeriodReadModel
}

// ── Case 1: 今月、比較なし (固定期間 preset) ──────────────

const case1: AcceptanceCase = {
  id: 'case-1-current-no-comparison',
  description: '今月 (preset) / 比較なし',
  frame: buildFreePeriodFrame(GOLDEN_SELECTION_NO_COMPARISON, GOLDEN_STORE_IDS, undefined),
  readModel: buildFreePeriodReadModel(GOLDEN_CURRENT_ROWS, []),
}

// ── Case 2: 今月 vs 前月 (固定期間 preset + previousPeriod) ─

const case2: AcceptanceCase = {
  id: 'case-2-current-vs-prev-month',
  description: '今月 vs 前月 (prevMonth preset)',
  frame: buildFreePeriodFrame(GOLDEN_SELECTION_VS_PREV_MONTH, GOLDEN_STORE_IDS, undefined),
  readModel: buildFreePeriodReadModel(GOLDEN_CURRENT_ROWS, GOLDEN_PREV_MONTH_ROWS),
}

// ── Case 3: 今月 vs 前年同期間 (sameRangeLastYear) ──────

const case3: AcceptanceCase = {
  id: 'case-3-current-vs-prev-year',
  description: '今月 vs 前年同期間 (prevYearSameMonth preset)',
  frame: buildFreePeriodFrame(GOLDEN_SELECTION_VS_PREV_YEAR, GOLDEN_STORE_IDS, undefined),
  readModel: buildFreePeriodReadModel(GOLDEN_CURRENT_ROWS, GOLDEN_PREV_YEAR_ROWS),
}

// ── Case 4: 月跨ぎ自由期間、比較なし ──────────────────────

const case4: AcceptanceCase = {
  id: 'case-4-month-boundary-free-period',
  description: '月跨ぎ自由期間 (3/28-4/6) / 比較なし',
  frame: buildFreePeriodFrame(GOLDEN_SELECTION_MONTH_BOUNDARY, GOLDEN_STORE_IDS, undefined),
  readModel: buildFreePeriodReadModel(GOLDEN_MONTH_BOUNDARY_ROWS, []),
}

// ── Case 5: 店舗 subset + fallback 想定 ─────────────────

const case5: AcceptanceCase = {
  id: 'case-5-store-subset',
  description: '店舗 subset (store-a + store-b) / 比較なし',
  frame: buildFreePeriodFrame(GOLDEN_SELECTION_NO_COMPARISON, GOLDEN_STORE_SUBSET_IDS, undefined),
  readModel: buildFreePeriodReadModel(GOLDEN_STORE_SUBSET_ROWS, []),
}

const ALL_CASES: readonly AcceptanceCase[] = [case1, case2, case3, case4, case5]

// ── 骨格 assertion ───────────────────────────────────────

describe('Critical Path Acceptance Suite (Phase 0.5 skeleton)', () => {
  describe('5 項目 (frame / rows / summary / provenance / fallback) を全ケースで固定で比較する', () => {
    it.each(ALL_CASES)('[$id] $description — 5 項目が揃う', ({ frame, readModel }) => {
      // 1. frame が正しく作られている (kind / anchorRange / storeIds / granularity)
      expect(frame.kind).toBe('free-period')
      expect(frame.anchorRange).toBeDefined()
      expect(frame.storeIds.length).toBeGreaterThan(0)
      expect(frame.granularity).toBe('day')

      // 2. currentRows / comparisonRows が readModel に載っている
      expect(readModel.currentRows).toBeDefined()
      expect(readModel.comparisonRows).toBeDefined()

      // 3. currentSummary / comparisonSummary が揃っている
      expect(readModel.currentSummary).toBeDefined()
      // comparisonSummary は comparison なしなら null
      if (frame.comparison == null) {
        expect(readModel.comparisonSummary).toBeNull()
      } else {
        expect(readModel.comparisonSummary).not.toBeNull()
      }

      // 4. provenance (Phase 2 で拡充) — 骨格段階では frame.comparison の有無のみ確認
      expect(frame.comparison === null || typeof frame.comparison === 'object').toBe(true)

      // 5. fallback (Phase 3 で拡充) — 骨格段階では meta.usedFallback の存在のみ確認
      expect(readModel.meta.usedFallback).toBe(false)
    })
  })

  describe('preset 入力と free-period 入力が同じ内部レーンを通る (parity 骨格)', () => {
    it('[case-1] preset 「今月」 frame と、同一 DateRange の自由期間 frame が同じ summary を返す', () => {
      // preset 経由 (今月 / 比較なし)
      const presetFrame = buildFreePeriodFrame(
        GOLDEN_SELECTION_NO_COMPARISON,
        GOLDEN_STORE_IDS,
        undefined,
      )
      const presetSummary = computeFreePeriodSummary(GOLDEN_CURRENT_ROWS)

      // 自由期間 (同一 DateRange を手入力で構築)
      const manualSelection = {
        period1: GOLDEN_CURRENT_RANGE,
        period2: GOLDEN_CURRENT_RANGE,
        comparisonEnabled: false as const,
        activePreset: 'custom' as const,
      }
      const manualFrame = buildFreePeriodFrame(manualSelection, GOLDEN_STORE_IDS, undefined)
      const manualSummary = computeFreePeriodSummary(GOLDEN_CURRENT_ROWS)

      // frame の意味的同一性
      expect(manualFrame.anchorRange).toEqual(presetFrame.anchorRange)
      expect(manualFrame.storeIds).toEqual(presetFrame.storeIds)
      expect(manualFrame.comparison).toEqual(presetFrame.comparison)

      // summary の完全一致
      expect(manualSummary).toEqual(presetSummary)
    })

    it('[case-2] preset 「前月」 frame と、同一 DateRange の自由期間 frame が同じ comparisonSummary を返す', () => {
      const presetFrame = buildFreePeriodFrame(
        GOLDEN_SELECTION_VS_PREV_MONTH,
        GOLDEN_STORE_IDS,
        undefined,
      )
      const presetRM = buildFreePeriodReadModel(GOLDEN_CURRENT_ROWS, GOLDEN_PREV_MONTH_ROWS)

      const manualSelection = {
        period1: GOLDEN_CURRENT_RANGE,
        period2: GOLDEN_PREV_MONTH_RANGE,
        comparisonEnabled: true as const,
        activePreset: 'custom' as const,
      }
      const manualFrame = buildFreePeriodFrame(manualSelection, GOLDEN_STORE_IDS, undefined)
      const manualRM = buildFreePeriodReadModel(GOLDEN_CURRENT_ROWS, GOLDEN_PREV_MONTH_ROWS)

      // anchorRange / storeIds の一致
      expect(manualFrame.anchorRange).toEqual(presetFrame.anchorRange)
      expect(manualFrame.storeIds).toEqual(presetFrame.storeIds)

      // summary の完全一致
      expect(manualRM.currentSummary).toEqual(presetRM.currentSummary)
      expect(manualRM.comparisonSummary).toEqual(presetRM.comparisonSummary)
    })
  })

  describe('手計算による sanity check (Phase 0.5 段階の最小)', () => {
    it('[case-1] 当期 summary が手計算と一致する', () => {
      // 当期 10 日 × 3 店舗。pattern: sales = baseSales * day
      //   store-a base 10000, store-b base 15000, store-c base 20000
      //   day 5〜14 の合計: 5+6+7+8+9+10+11+12+13+14 = 95
      //   totalSales = 95 * (10000 + 15000 + 20000) = 95 * 45000 = 4,275,000
      const expectedTotalSales = 95 * (10000 + 15000 + 20000)
      const summary = computeFreePeriodSummary(GOLDEN_CURRENT_ROWS)
      expect(summary.totalSales).toBe(expectedTotalSales)
      expect(summary.storeCount).toBe(3)
      expect(summary.dayCount).toBe(10)
    })

    it('[case-5] 店舗 subset (2 店舗) の summary が 2/3 スケールになる', () => {
      // store-a + store-b の totalSales = 95 * (10000 + 15000) = 95 * 25000 = 2,375,000
      const expectedTotalSales = 95 * (10000 + 15000)
      const summary = computeFreePeriodSummary(GOLDEN_STORE_SUBSET_ROWS)
      expect(summary.totalSales).toBe(expectedTotalSales)
      expect(summary.storeCount).toBe(2)
      expect(summary.dayCount).toBe(10)
    })

    it('[case-4] 月跨ぎ (3/28-4/6) の dayCount が 10 日になる', () => {
      const summary = computeFreePeriodSummary(GOLDEN_MONTH_BOUNDARY_ROWS)
      // 3/28, 29, 30, 31, 4/1, 2, 3, 4, 5, 6 = 10 日
      expect(summary.dayCount).toBe(10)
      expect(summary.storeCount).toBe(3)
    })
  })
})
