/**
 * frame.comparison ↔ useComparisonModule 内部経路 parity テスト
 *
 * ## 目的
 *
 * unify-period-analysis Phase 1 で `useUnifiedWidgetContext` に
 * `buildFreePeriodFrame` 経由の frame 配線が入った一方で、
 * `useComparisonSlice` の内部はまだ `useComparisonModule(periodSelection, ...)`
 * を pass-through している過渡状態にある（`useComparisonSlice.ts` の JSDoc
 * 参照）。この期間中、入口契約 (frame.comparison) と内部比較経路
 * (`useComparisonModule` 内の `buildComparisonScope` 呼び出し) が **同じ
 * PeriodSelection から同じ ComparisonScope を導出する** という不変条件が
 * 守られなければならない。
 *
 * ## 守る不変条件
 *
 * 同じ `(PeriodSelection, elapsedDays)` ペアに対して、次の 2 つが deeply equal
 * であること（または両方 null であること）:
 *
 *   1. `buildFreePeriodFrame(selection, storeIds, elapsedDays).comparison`
 *      — frame 経路（domain/models/buildFreePeriodFrame.ts）
 *
 *   2. `selection.comparisonEnabled ? buildComparisonScope(selection, elapsedDays) : null`
 *      — 現行 useComparisonModule が内部で構築する scope
 *      （features/comparison/application/hooks/useComparisonModule.ts:115-118 と
 *      ロジック等価）
 *
 * 現時点では `buildFreePeriodFrame` 内部で同じ `buildComparisonScope` を直接
 * 呼んでいるため、構造的にこの不変条件は成立する。本テストはそれを **将来
 * の片側変更（buildFreePeriodFrame だけ修正、useComparisonModule だけ修正等）
 * に対する安全網** として固定する。Phase 6 で `useComparisonModule` を
 * `ComparisonScope` 直接受領に書き換える際の回帰基準にもなる。
 *
 * @see projects/completed/unify-period-analysis/checklist.md Phase 1 完了範囲の明示
 * @see app/src/presentation/hooks/slices/useComparisonSlice.ts JSDoc
 */
import { describe, it, expect } from 'vitest'
import { buildFreePeriodFrame } from '@/domain/models/buildFreePeriodFrame'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import { applyPreset } from '@/domain/models/PeriodSelection'
import type { DateRange } from '@/domain/models/CalendarDate'

const STORE_IDS = ['store-a', 'store-b', 'store-c'] as const
const ELAPSED_DAYS = 10

const period1: DateRange = {
  from: { year: 2026, month: 3, day: 5 },
  to: { year: 2026, month: 3, day: 14 },
}

/**
 * useComparisonModule 内部の scope 構築ロジックを 1:1 再現する pure helper。
 * 実体は `features/comparison/application/hooks/useComparisonModule.ts:115-118`
 * の useMemo callback と同じ。
 */
function buildScopeAsModuleWould(selection: PeriodSelection, elapsedDays?: number) {
  if (!selection.comparisonEnabled) return null
  return buildComparisonScope(selection, elapsedDays)
}

interface ParityCase {
  readonly id: string
  readonly description: string
  readonly selection: PeriodSelection
}

// ── 3 ケース ──

const caseNoComparison: ParityCase = {
  id: 'no-comparison',
  description: '比較なし (comparisonEnabled: false)',
  selection: {
    period1,
    period2: period1, // placeholder
    comparisonEnabled: false,
    activePreset: 'custom',
  },
}

const caseSameDow: ParityCase = {
  id: 'same-dow',
  description: 'sameDow (prevYearSameDow preset)',
  selection: {
    period1,
    period2: applyPreset(period1, 'prevYearSameDow', period1),
    comparisonEnabled: true,
    activePreset: 'prevYearSameDow',
  },
}

const caseSameRangeLastYear: ParityCase = {
  id: 'same-range-last-year',
  description: 'sameRangeLastYear (prevYearSameMonth preset)',
  selection: {
    period1,
    period2: applyPreset(period1, 'prevYearSameMonth', period1),
    comparisonEnabled: true,
    activePreset: 'prevYearSameMonth',
  },
}

const ALL_CASES: readonly ParityCase[] = [caseNoComparison, caseSameDow, caseSameRangeLastYear]

// ── parity assertion ───────────────────────────────────────

describe('frame.comparison ↔ useComparisonModule scope parity (Phase 1 暫定二重入口)', () => {
  it.each(ALL_CASES)(
    '[$id] $description — frame.comparison が useComparisonModule scope と等価',
    ({ selection }) => {
      const frame = buildFreePeriodFrame(selection, STORE_IDS, ELAPSED_DAYS)
      const moduleScope = buildScopeAsModuleWould(selection, ELAPSED_DAYS)

      // 完全等価性 (両方 null も含めて)
      expect(frame.comparison).toEqual(moduleScope)
    },
  )

  it('[no-comparison] 両経路で comparison が null になる (有無の一致)', () => {
    const frame = buildFreePeriodFrame(caseNoComparison.selection, STORE_IDS, ELAPSED_DAYS)
    const moduleScope = buildScopeAsModuleWould(caseNoComparison.selection, ELAPSED_DAYS)
    expect(frame.comparison).toBeNull()
    expect(moduleScope).toBeNull()
  })

  it('[same-dow] alignmentMode が両経路で sameDayOfWeek である', () => {
    const frame = buildFreePeriodFrame(caseSameDow.selection, STORE_IDS, ELAPSED_DAYS)
    const moduleScope = buildScopeAsModuleWould(caseSameDow.selection, ELAPSED_DAYS)
    expect(frame.comparison?.alignmentMode).toBe('sameDayOfWeek')
    expect(moduleScope?.alignmentMode).toBe('sameDayOfWeek')
    // dowOffset も両経路で一致
    expect(frame.comparison?.dowOffset).toBe(moduleScope?.dowOffset)
  })

  it('[same-range-last-year] alignmentMode が両経路で sameDate である', () => {
    const frame = buildFreePeriodFrame(caseSameRangeLastYear.selection, STORE_IDS, ELAPSED_DAYS)
    const moduleScope = buildScopeAsModuleWould(caseSameRangeLastYear.selection, ELAPSED_DAYS)
    expect(frame.comparison?.alignmentMode).toBe('sameDate')
    expect(moduleScope?.alignmentMode).toBe('sameDate')
    expect(frame.comparison?.dowOffset).toBe(0)
    expect(moduleScope?.dowOffset).toBe(0)
  })

  it.each([caseSameDow, caseSameRangeLastYear])(
    '[$id] comparison range の from/to が両経路で一致する',
    ({ selection }) => {
      const frame = buildFreePeriodFrame(selection, STORE_IDS, ELAPSED_DAYS)
      const moduleScope = buildScopeAsModuleWould(selection, ELAPSED_DAYS)
      expect(frame.comparison?.period1).toEqual(moduleScope?.period1)
      expect(frame.comparison?.period2).toEqual(moduleScope?.period2)
      expect(frame.comparison?.effectivePeriod1).toEqual(moduleScope?.effectivePeriod1)
      expect(frame.comparison?.effectivePeriod2).toEqual(moduleScope?.effectivePeriod2)
    },
  )

  it.each([caseSameDow, caseSameRangeLastYear])(
    '[$id] alignmentMap (fallback / sourceDate 由来) が両経路で一致する',
    ({ selection }) => {
      const frame = buildFreePeriodFrame(selection, STORE_IDS, ELAPSED_DAYS)
      const moduleScope = buildScopeAsModuleWould(selection, ELAPSED_DAYS)
      // alignmentMap 全エントリの一致 → fallback / sourceDate 経路の一致を含意
      expect(frame.comparison?.alignmentMap).toEqual(moduleScope?.alignmentMap)
      // queryRanges / sourceMonth も一致 (取得経路 fallback の入口)
      expect(frame.comparison?.queryRanges).toEqual(moduleScope?.queryRanges)
      expect(frame.comparison?.sourceMonth).toEqual(moduleScope?.sourceMonth)
    },
  )

  it('elapsedDays の値が両経路で同じ effectivePeriod1 を返す (cap 整合性)', () => {
    // 短い elapsedDays で period1 が cap される系も locked
    const cappedElapsed = 3
    const frame = buildFreePeriodFrame(caseSameRangeLastYear.selection, STORE_IDS, cappedElapsed)
    const moduleScope = buildScopeAsModuleWould(caseSameRangeLastYear.selection, cappedElapsed)
    expect(frame.comparison?.effectivePeriod1).toEqual(moduleScope?.effectivePeriod1)
    // period1 の to.day は 14 だが effectivePeriod1.to.day は from.day + cappedElapsed - 1 で cap される
    expect(frame.comparison?.effectivePeriod1.to.day).toBeLessThanOrEqual(
      caseSameRangeLastYear.selection.period1.from.day + cappedElapsed - 1,
    )
  })
})
