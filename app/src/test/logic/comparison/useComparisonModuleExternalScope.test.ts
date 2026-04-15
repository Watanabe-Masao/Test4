// useComparisonModule externalScope parameter — behavioral contract test
//
// unify-period-analysis Phase 6a: useComparisonModule が externalScope を
// 受け取れるようになったことを、hook 実行せずに構築経路レベルで locked。
//
// 守る不変条件:
//
//   externalScope が渡された場合、その値がそのまま scope として使われる。
//   - externalScope === undefined → 内部構築 (periodSelection ベース)
//   - externalScope === null      → 比較無効 (periodSelection.comparisonEnabled=false 等価)
//   - externalScope === <scope>   → その scope をそのまま使用 (内部構築 skip)
//
// Phase 1 parity test (frameComparisonParity.test.ts) と組み合わせると:
//   buildFreePeriodFrame(selection, ..., elapsed).comparison
//     === 内部構築 buildComparisonScope(selection, elapsed)
// が既に固定されているため、externalScope=frame.comparison で渡しても
// 挙動は内部構築と完全に同じ。本 test はそれを独立に確認する補助 test。
import { describe, it, expect } from 'vitest'
import { buildFreePeriodFrame } from '@/domain/models/buildFreePeriodFrame'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'

const STORE_IDS = ['store-a'] as const
const ELAPSED_DAYS = 10

const baseSelection: PeriodSelection = {
  period1: {
    from: { year: 2026, month: 4, day: 1 },
    to: { year: 2026, month: 4, day: 30 },
  },
  period2: {
    from: { year: 2025, month: 4, day: 1 },
    to: { year: 2025, month: 4, day: 30 },
  },
  comparisonEnabled: true,
  activePreset: 'prevYearSameMonth',
}

/**
 * useComparisonModule 内部の scope 解決ロジックを再現した pure helper。
 * 実際の hook の useMemo callback と 1:1 対応する (module 内部の L115-120):
 *
 *   if (externalScope !== undefined) return externalScope
 *   if (!periodSelection.comparisonEnabled) return null
 *   return buildComparisonScope(periodSelection, elapsedDays)
 */
function resolveScopeAsModuleWould(
  selection: PeriodSelection,
  elapsedDays: number | undefined,
  externalScope: ComparisonScope | null | undefined,
): ComparisonScope | null {
  if (externalScope !== undefined) return externalScope
  if (!selection.comparisonEnabled) return null
  return buildComparisonScope(selection, elapsedDays)
}

describe('useComparisonModule externalScope resolution (Phase 6a)', () => {
  it('externalScope=undefined: 内部構築経路 (periodSelection + elapsedDays) と一致', () => {
    const resolved = resolveScopeAsModuleWould(baseSelection, ELAPSED_DAYS, undefined)
    const expected = buildComparisonScope(baseSelection, ELAPSED_DAYS)
    expect(resolved).toEqual(expected)
  })

  it('externalScope=undefined + comparisonEnabled=false: null を返す', () => {
    const disabled: PeriodSelection = { ...baseSelection, comparisonEnabled: false }
    const resolved = resolveScopeAsModuleWould(disabled, ELAPSED_DAYS, undefined)
    expect(resolved).toBeNull()
  })

  it('externalScope=null: 明示的に比較無効 (periodSelection.comparisonEnabled に関係なく)', () => {
    const resolved = resolveScopeAsModuleWould(baseSelection, ELAPSED_DAYS, null)
    expect(resolved).toBeNull()
  })

  it('externalScope=<scope>: その scope をそのまま返す (内部構築 skip)', () => {
    const custom = buildComparisonScope(baseSelection, ELAPSED_DAYS)
    const resolved = resolveScopeAsModuleWould(baseSelection, ELAPSED_DAYS, custom)
    // 同一 reference (== equal) であることを確認
    expect(resolved).toBe(custom)
  })

  it('Phase 1 parity 復習: buildFreePeriodFrame + useComparisonModule が同じ scope を作る', () => {
    const frame = buildFreePeriodFrame(baseSelection, STORE_IDS, ELAPSED_DAYS)
    const internal = buildComparisonScope(baseSelection, ELAPSED_DAYS)
    expect(frame.comparison).toEqual(internal)
  })

  it('Phase 6a 等価性: externalScope=frame.comparison を渡しても内部構築と等価', () => {
    const frame = buildFreePeriodFrame(baseSelection, STORE_IDS, ELAPSED_DAYS)
    const viaExternal = resolveScopeAsModuleWould(baseSelection, ELAPSED_DAYS, frame.comparison)
    const viaInternal = resolveScopeAsModuleWould(baseSelection, ELAPSED_DAYS, undefined)
    expect(viaExternal).toEqual(viaInternal)
  })

  it('prevYearSameDow preset: externalScope=frame.comparison でも等価', () => {
    const dowSelection: PeriodSelection = {
      ...baseSelection,
      activePreset: 'prevYearSameDow',
    }
    const frame = buildFreePeriodFrame(dowSelection, STORE_IDS, ELAPSED_DAYS)
    const viaExternal = resolveScopeAsModuleWould(dowSelection, ELAPSED_DAYS, frame.comparison)
    const viaInternal = resolveScopeAsModuleWould(dowSelection, ELAPSED_DAYS, undefined)
    expect(viaExternal).toEqual(viaInternal)
  })

  it('elapsedDays cap: externalScope=frame.comparison でも cap 反映される', () => {
    const shortElapsed = 5
    const frame = buildFreePeriodFrame(baseSelection, STORE_IDS, shortElapsed)
    const viaExternal = resolveScopeAsModuleWould(baseSelection, shortElapsed, frame.comparison)
    // effectivePeriod1 の to.day が cap されていることを確認
    expect(viaExternal?.effectivePeriod1.to.day).toBeLessThanOrEqual(
      baseSelection.period1.from.day + shortElapsed - 1,
    )
  })
})
