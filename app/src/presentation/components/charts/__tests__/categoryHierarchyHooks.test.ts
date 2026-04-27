/**
 * categoryHierarchyHooks — filterByHierarchy / getHierarchyLevel tests
 *
 * 純粋関数のみ対象（useCategoryHierarchy は React Context hook）。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { filterByHierarchy, getHierarchyLevel } from '../categoryHierarchyHooks'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'

function entry(overrides: Partial<CategoryLeafDailyEntry> = {}): CategoryLeafDailyEntry {
  return {
    deptCode: 'D1',
    lineCode: 'L1',
    klassCode: 'K1',
    ...overrides,
  } as CategoryLeafDailyEntry
}

describe('filterByHierarchy', () => {
  it('filter が空なら records をそのまま返す', () => {
    const records = [entry(), entry({ deptCode: 'D2' })]
    const r = filterByHierarchy(records, {})
    expect(r).toBe(records)
  })

  it('departmentCode で絞り込み', () => {
    const records = [
      entry({ deptCode: 'D1' }),
      entry({ deptCode: 'D2' }),
      entry({ deptCode: 'D1' }),
    ]
    const r = filterByHierarchy(records, { departmentCode: 'D1' })
    expect(r).toHaveLength(2)
    expect(r.every((e) => e.deptCode === 'D1')).toBe(true)
  })

  it('lineCode で絞り込み', () => {
    const records = [entry({ lineCode: 'L1' }), entry({ lineCode: 'L2' })]
    const r = filterByHierarchy(records, { lineCode: 'L1' })
    expect(r).toHaveLength(1)
    expect(r[0].lineCode).toBe('L1')
  })

  it('departmentCode + lineCode の AND 条件', () => {
    const records = [
      entry({ deptCode: 'D1', lineCode: 'L1' }),
      entry({ deptCode: 'D1', lineCode: 'L2' }),
      entry({ deptCode: 'D2', lineCode: 'L1' }),
    ]
    const r = filterByHierarchy(records, { departmentCode: 'D1', lineCode: 'L1' })
    expect(r).toHaveLength(1)
    expect(r[0].deptCode).toBe('D1')
    expect(r[0].lineCode).toBe('L1')
  })

  it('マッチしなければ空配列', () => {
    const records = [entry({ deptCode: 'D1' })]
    const r = filterByHierarchy(records, { departmentCode: 'D99' })
    expect(r).toEqual([])
  })
})

describe('getHierarchyLevel', () => {
  it("空フィルタは 'department'", () => {
    expect(getHierarchyLevel({})).toBe('department')
  })

  it("departmentCode のみ指定 → 'line'", () => {
    expect(getHierarchyLevel({ departmentCode: 'D1' })).toBe('line')
  })

  it("lineCode も指定 → 'klass'", () => {
    expect(getHierarchyLevel({ departmentCode: 'D1', lineCode: 'L1' })).toBe('klass')
  })

  it('lineCode だけで departmentCode なしでも klass（lineCode 優先）', () => {
    expect(getHierarchyLevel({ lineCode: 'L1' })).toBe('klass')
  })
})
