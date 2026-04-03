/**
 * useCategoryHierarchyData — pure input builder のユニットテスト
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H2 比較は pair/bundle 契約
 */
import { describe, it, expect } from 'vitest'
import { buildHierarchyPairInput, buildHierarchyHourlyPairInput } from './useCategoryHierarchyData'
import type { DateRange } from '@/domain/models/CalendarDate'

const curRange: DateRange = {
  from: { year: 2025, month: 3, day: 1 },
  to: { year: 2025, month: 3, day: 31 },
}
const prevRange: DateRange = {
  from: { year: 2024, month: 3, day: 1 },
  to: { year: 2024, month: 3, day: 31 },
}

describe('buildHierarchyPairInput', () => {
  it('prev なし: comparisonDateFrom/To が未設定', () => {
    const input = buildHierarchyPairInput(curRange, undefined, undefined, 'department', {})
    expect(input.dateFrom).toBe('2025-03-01')
    expect(input.dateTo).toBe('2025-03-31')
    expect(input.comparisonDateFrom).toBeUndefined()
    expect(input.comparisonDateTo).toBeUndefined()
    expect(input.level).toBe('department')
  })

  it('prev あり: comparisonDateFrom/To が設定される', () => {
    const input = buildHierarchyPairInput(curRange, prevRange, undefined, 'line', {})
    expect(input.dateFrom).toBe('2025-03-01')
    expect(input.comparisonDateFrom).toBe('2024-03-01')
    expect(input.comparisonDateTo).toBe('2024-03-31')
    expect(input.level).toBe('line')
  })

  it('filter が正しく反映される', () => {
    const input = buildHierarchyPairInput(curRange, undefined, ['S1', 'S2'], 'klass', {
      departmentCode: 'D01',
      lineCode: 'L01',
    })
    expect(input.storeIds).toEqual(['S1', 'S2'])
    expect(input.deptCode).toBe('D01')
    expect(input.lineCode).toBe('L01')
  })

  it('storeIds undefined の場合はそのまま undefined', () => {
    const input = buildHierarchyPairInput(curRange, undefined, undefined, 'department', {})
    expect(input.storeIds).toBeUndefined()
  })
})

describe('buildHierarchyHourlyPairInput', () => {
  it('prev なし: comparisonDateFrom/To が未設定', () => {
    const input = buildHierarchyHourlyPairInput(curRange, undefined, undefined, 'department', {})
    expect(input.comparisonDateFrom).toBeUndefined()
    expect(input.comparisonDateTo).toBeUndefined()
  })

  it('prev あり: comparisonDateFrom/To が設定される', () => {
    const input = buildHierarchyHourlyPairInput(curRange, prevRange, ['S1'], 'line', {
      departmentCode: 'D02',
    })
    expect(input.comparisonDateFrom).toBe('2024-03-01')
    expect(input.comparisonDateTo).toBe('2024-03-31')
    expect(input.storeIds).toEqual(['S1'])
    expect(input.deptCode).toBe('D02')
  })
})
