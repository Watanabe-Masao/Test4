import { describe, it, expect } from 'vitest'
import { toYoyDailyRowVm } from '../comparisonVm'
import type { ResolvedComparisonRow } from '../comparisonTypes'

function makeResolved(overrides: Partial<ResolvedComparisonRow>): ResolvedComparisonRow {
  return {
    compareMode: 'sameDate',
    alignmentKey: 'S1||2026-03-01|2025-03-01|sameDate',
    storeId: 'S1',
    currentDateKey: '2026-03-01',
    requestedCompareDateKey: '2025-03-01',
    compareDateKey: '2025-03-01',
    currentSales: 200,
    compareSales: 150,
    currentCustomers: 20,
    compareCustomers: 15,
    status: 'matched',
    ...overrides,
  }
}

describe('toYoyDailyRowVm', () => {
  it('matched → diff 計算', () => {
    const rows = [makeResolved({})]
    const vm = toYoyDailyRowVm(rows)

    expect(vm).toHaveLength(1)
    expect(vm[0].curDateKey).toBe('2026-03-01')
    expect(vm[0].prevDateKey).toBe('2025-03-01')
    expect(vm[0].storeId).toBe('S1')
    expect(vm[0].curSales).toBe(200)
    expect(vm[0].prevSales).toBe(150)
    expect(vm[0].salesDiff).toBe(50)
    expect(vm[0].curCustomers).toBe(20)
    expect(vm[0].prevCustomers).toBe(15)
    expect(vm[0].matchStatus).toBe('matched')
  })

  it('missing_previous → null handling', () => {
    const rows = [
      makeResolved({
        compareDateKey: null,
        compareSales: null,
        compareCustomers: null,
        status: 'missing_previous',
      }),
    ]
    const vm = toYoyDailyRowVm(rows)

    expect(vm[0].prevSales).toBeNull()
    expect(vm[0].prevCustomers).toBeNull()
    expect(vm[0].salesDiff).toBe(200) // curSales - 0
    expect(vm[0].matchStatus).toBe('missing_previous')
  })

  it('matchStatus の保持', () => {
    const rows = [
      makeResolved({ status: 'matched' }),
      makeResolved({ status: 'missing_previous', compareSales: null, compareCustomers: null }),
      makeResolved({ status: 'ambiguous_previous', compareSales: null, compareCustomers: null }),
    ]
    const vm = toYoyDailyRowVm(rows)

    expect(vm[0].matchStatus).toBe('matched')
    expect(vm[1].matchStatus).toBe('missing_previous')
    expect(vm[2].matchStatus).toBe('ambiguous_previous')
  })

  it('currentSales が null の場合 curSales は 0', () => {
    const rows = [makeResolved({ currentSales: null })]
    const vm = toYoyDailyRowVm(rows)
    expect(vm[0].curSales).toBe(0)
  })

  it('入力順を保持', () => {
    const rows = [
      makeResolved({ currentDateKey: '2026-03-03', storeId: 'S2' }),
      makeResolved({ currentDateKey: '2026-03-01', storeId: 'S1' }),
    ]
    const vm = toYoyDailyRowVm(rows)
    expect(vm[0].curDateKey).toBe('2026-03-03')
    expect(vm[1].curDateKey).toBe('2026-03-01')
  })
})
