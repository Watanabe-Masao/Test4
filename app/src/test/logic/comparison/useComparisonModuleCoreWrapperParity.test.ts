/**
 * useComparisonModule wrapper/core parity — Phase O5 regression test
 *
 * phase-6-optional-comparison-projection Phase O5:
 * wrapper (application/hooks/useComparisonModule.ts) と core
 * (features/comparison/application/hooks/useComparisonModuleCore.ts) の
 * 責務分離が正しく行われていることを検証する。
 *
 * ## テスト対象
 *
 * 1. disable-path regression:
 *    - externalScope === undefined → 内部構築 (wrapper 責務)
 *    - externalScope === null → 比較無効 (wrapper 責務)
 *    - !comparisonEnabled → null scope (wrapper 責務)
 *    - ※ core は scope を受け取るだけで disable-path を知らない
 *
 * 2. wrapper/core projectionContext parity:
 *    - wrapper が buildComparisonProjectionContext(ps) で作る context が
 *      core の期待する ComparisonProjectionContext 構造と一致する
 *    - buildKpiProjection が旧 signature (periodSelection) と新 signature
 *      (ComparisonProjectionContext) で同一出力を返す (O3 parity で保証済み、
 *      ここでは構造の一致のみ再確認)
 *
 * ## 設計判断
 *
 * renderHook は使わない。wrapper の scope 構築も projectionContext 構築も
 * pure function の組み合わせなので、pure function extraction で十分。
 * 既存の useComparisonModuleExternalScope.test.ts と同じアプローチ。
 *
 * @see app/src/test/logic/comparison/useComparisonModuleExternalScope.test.ts
 */
import { describe, it, expect } from 'vitest'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
import { buildComparisonProjectionContext } from '@/features/comparison/application/buildComparisonProjectionContext'
import type { ComparisonProjectionContext } from '@/features/comparison/application/ComparisonProjectionContext'

// ── fixtures ──

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

const disabledSelection: PeriodSelection = {
  ...baseSelection,
  comparisonEnabled: false,
}

const ELAPSED_DAYS = 15

// ── pure function extraction ──
// wrapper の scope 解決ロジックを再現 (application/hooks/useComparisonModule.ts L43-47)

function resolveScope(
  ps: PeriodSelection,
  elapsedDays: number | undefined,
  externalScope: ComparisonScope | null | undefined,
): ComparisonScope | null {
  if (externalScope !== undefined) return externalScope
  if (!ps.comparisonEnabled) return null
  return buildComparisonScope(ps, elapsedDays)
}

// ── tests ──

describe('Phase O5: wrapper disable-path regression', () => {
  it('externalScope === undefined → 内部構築 (wrapper が buildComparisonScope を呼ぶ)', () => {
    const scope = resolveScope(baseSelection, ELAPSED_DAYS, undefined)
    const expected = buildComparisonScope(baseSelection, ELAPSED_DAYS)
    expect(scope).toEqual(expected)
    expect(scope).not.toBeNull()
  })

  it('externalScope === null → 比較無効 (comparisonEnabled に関わらず null)', () => {
    const scope = resolveScope(baseSelection, ELAPSED_DAYS, null)
    expect(scope).toBeNull()
  })

  it('!comparisonEnabled + externalScope undefined → null (idle path)', () => {
    const scope = resolveScope(disabledSelection, ELAPSED_DAYS, undefined)
    expect(scope).toBeNull()
  })

  it('!comparisonEnabled + externalScope === <scope> → externalScope 優先 (null ではない)', () => {
    const explicit = buildComparisonScope(baseSelection, ELAPSED_DAYS)
    const scope = resolveScope(disabledSelection, ELAPSED_DAYS, explicit)
    expect(scope).toBe(explicit)
    expect(scope).not.toBeNull()
  })

  it('externalScope === <scope> → scope をそのまま通す (reference equality)', () => {
    const custom = buildComparisonScope(baseSelection, ELAPSED_DAYS)
    const scope = resolveScope(baseSelection, ELAPSED_DAYS, custom)
    expect(scope).toBe(custom)
  })
})

describe('Phase O5: wrapper/core projectionContext parity', () => {
  it('wrapper が作る projectionContext は buildComparisonProjectionContext と同一', () => {
    // wrapper 内の useMemo callback を再現
    const wrapperCtx = buildComparisonProjectionContext(baseSelection)

    expect(wrapperCtx.basisYear).toBe(baseSelection.period1.from.year)
    expect(wrapperCtx.basisMonth).toBe(baseSelection.period1.from.month)
    expect(wrapperCtx.period2).toBe(baseSelection.period2)
  })

  it('projectionContext は PeriodSelection のフィールドを含まない (最小面)', () => {
    const ctx = buildComparisonProjectionContext(baseSelection)
    const keys = Object.keys(ctx).sort()
    expect(keys).toEqual(['basisMonth', 'basisYear', 'period2'])
  })

  it('elapsedDays cap された period1 でも basisYear/basisMonth は正しい', () => {
    const capped: PeriodSelection = {
      ...baseSelection,
      period1: {
        from: { year: 2026, month: 4, day: 1 },
        to: { year: 2026, month: 4, day: 15 }, // cap
      },
    }
    const ctx = buildComparisonProjectionContext(capped)
    expect(ctx.basisYear).toBe(2026)
    expect(ctx.basisMonth).toBe(4)
  })

  it('activePreset が異なっても projectionContext は同一 (activePreset は除外済み)', () => {
    const dow: PeriodSelection = { ...baseSelection, activePreset: 'prevYearSameDow' }
    const month: PeriodSelection = { ...baseSelection, activePreset: 'prevYearSameMonth' }
    const custom: PeriodSelection = { ...baseSelection, activePreset: 'custom' }

    const ctxDow = buildComparisonProjectionContext(dow)
    const ctxMonth = buildComparisonProjectionContext(month)
    const ctxCustom = buildComparisonProjectionContext(custom)

    expect(ctxDow).toEqual(ctxMonth)
    expect(ctxMonth).toEqual(ctxCustom)
  })

  it('comparisonEnabled が異なっても projectionContext は同一 (comparisonEnabled は除外済み)', () => {
    const enabled = buildComparisonProjectionContext(baseSelection)
    const disabled = buildComparisonProjectionContext(disabledSelection)
    expect(enabled).toEqual(disabled)
  })
})
