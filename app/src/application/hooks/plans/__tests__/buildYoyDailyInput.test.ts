/**
 * buildYoyDailyInput pure builder — unit test
 *
 * unify-period-analysis Phase 5: YoYChart.tsx から scope 内部フィールド
 * アクセスを剥がした pure builder の挙動を locked。
 */
import { describe, it, expect } from 'vitest'
import { buildYoyDailyInput } from '@/application/hooks/plans/buildYoyDailyInput'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { PrevYearScope } from '@/domain/models/calendar'

function makeScope(overrides: Partial<ComparisonScope> = {}): ComparisonScope {
  return {
    period1: {
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 30 },
    },
    period2: {
      from: { year: 2025, month: 4, day: 1 },
      to: { year: 2025, month: 4, day: 30 },
    },
    preset: 'prevYearSameMonth',
    alignmentMode: 'sameDate',
    dowOffset: 0,
    effectivePeriod1: {
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 15 },
    },
    effectivePeriod2: {
      from: { year: 2025, month: 4, day: 1 },
      to: { year: 2025, month: 4, day: 15 },
    },
    queryRanges: [{ year: 2025, month: 4 }],
    alignmentMap: [
      {
        sourceDate: { year: 2025, month: 4, day: 1 },
        targetDate: { year: 2026, month: 4, day: 1 },
        sourceDayKey: '2025-04-01',
        targetDayKey: '2026-04-01',
      },
    ],
    sourceMonth: { year: 2025, month: 4 },
    ...overrides,
  }
}

function makePrevYearScope(overrides: Partial<PrevYearScope> = {}): PrevYearScope {
  return {
    dateRange: {
      from: { year: 2025, month: 4, day: 1 },
      to: { year: 2025, month: 4, day: 10 },
    },
    totalCustomers: 1000,
    dowOffset: 0,
    ...overrides,
  }
}

describe('buildYoyDailyInput', () => {
  it('scope=null: null を返す', () => {
    const result = buildYoyDailyInput(null, undefined, new Set<string>())
    expect(result).toBeNull()
  })

  it('scope あり + prevYearScope なし: effectivePeriod2 を prev として使う', () => {
    const scope = makeScope()
    const result = buildYoyDailyInput(scope, undefined, new Set<string>())
    expect(result).not.toBeNull()
    expect(result?.curDateFrom).toBe('2026-04-01')
    expect(result?.curDateTo).toBe('2026-04-15')
    // scope.effectivePeriod2 (2025-04-01 .. 2025-04-15) が prev として使われる
    expect(result?.prevDateFrom).toBe('2025-04-01')
    expect(result?.prevDateTo).toBe('2025-04-15')
  })

  it('scope あり + prevYearScope あり: prevYearScope.dateRange を優先する (cap 反映)', () => {
    const scope = makeScope()
    const prevYearScope = makePrevYearScope({
      dateRange: {
        from: { year: 2025, month: 4, day: 1 },
        to: { year: 2025, month: 4, day: 10 }, // 短い cap
      },
    })
    const result = buildYoyDailyInput(scope, prevYearScope, new Set<string>())
    // prevYearScope.dateRange が scope.effectivePeriod2 を上書き
    expect(result?.prevDateFrom).toBe('2025-04-01')
    expect(result?.prevDateTo).toBe('2025-04-10')
  })

  it('storeIds 空集合: undefined を返す (全店対象)', () => {
    const scope = makeScope()
    const result = buildYoyDailyInput(scope, undefined, new Set<string>())
    expect(result?.storeIds).toBeUndefined()
  })

  it('storeIds 非空: 配列として渡す', () => {
    const scope = makeScope()
    const storeIds = new Set<string>(['store-a', 'store-b'])
    const result = buildYoyDailyInput(scope, undefined, storeIds)
    expect(result?.storeIds).toHaveLength(2)
    expect(new Set(result?.storeIds ?? [])).toEqual(new Set(['store-a', 'store-b']))
  })

  it('alignmentMode=sameDate: compareMode が sameDate', () => {
    const scope = makeScope({ alignmentMode: 'sameDate' })
    const result = buildYoyDailyInput(scope, undefined, new Set<string>())
    expect(result?.compareMode).toBe('sameDate')
  })

  it('alignmentMode=sameDayOfWeek: compareMode が sameDayOfWeek', () => {
    const scope = makeScope({ alignmentMode: 'sameDayOfWeek' })
    const result = buildYoyDailyInput(scope, undefined, new Set<string>())
    expect(result?.compareMode).toBe('sameDayOfWeek')
  })

  it('pure: 同じ入力で同じ出力を返す (非破壊性)', () => {
    const scope = makeScope()
    const a = buildYoyDailyInput(scope, undefined, new Set<string>())
    const b = buildYoyDailyInput(scope, undefined, new Set<string>())
    expect(a).toEqual(b)
  })
})
