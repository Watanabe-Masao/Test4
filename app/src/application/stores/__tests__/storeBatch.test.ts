/**
 * Multiple Zustand stores — actions test
 *
 * 対象:
 * - filterStore: setDayRange, setAggregateMode, toggleDow, selectAllDows,
 *   setHierarchyDept/Line/Klass, setCategoryFilter/DepartmentFilter, resetDayRange, resetAll
 * - pageStore: addPage, removePage, renamePage, updatePageDefaults
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterStore } from '../filterStore'
import { usePageStore } from '../pageStore'

// ─── filterStore ────────────────────────

describe('filterStore', () => {
  beforeEach(() => {
    useFilterStore.getState().resetAll()
  })

  it('初期状態: dayRange=[1,31], aggregate=total, selectedDows=空', () => {
    const state = useFilterStore.getState()
    expect(state.dayRange).toEqual([1, 31])
    expect(state.aggregateMode).toBe('total')
    expect(state.selectedDows.size).toBe(0)
  })

  it('setDayRange', () => {
    useFilterStore.getState().setDayRange([5, 20])
    expect(useFilterStore.getState().dayRange).toEqual([5, 20])
  })

  it('setAggregateMode', () => {
    useFilterStore.getState().setAggregateMode('daily')
    expect(useFilterStore.getState().aggregateMode).toBe('daily')
  })

  it('toggleDow: 追加 → 削除', () => {
    useFilterStore.getState().toggleDow(1)
    expect(useFilterStore.getState().selectedDows.has(1)).toBe(true)
    useFilterStore.getState().toggleDow(1)
    expect(useFilterStore.getState().selectedDows.has(1)).toBe(false)
  })

  it('selectAllDows: empty Set (all selected 状態)', () => {
    useFilterStore.getState().toggleDow(1)
    useFilterStore.getState().selectAllDows()
    expect(useFilterStore.getState().selectedDows.size).toBe(0)
  })

  it('setHierarchyDept: lineCode / klassCode をリセット', () => {
    useFilterStore.getState().setHierarchyLine('L1')
    useFilterStore.getState().setHierarchyKlass('K1')
    useFilterStore.getState().setHierarchyDept('D2')
    const hierarchy = useFilterStore.getState().hierarchy
    expect(hierarchy.deptCode).toBe('D2')
    expect(hierarchy.lineCode).toBeNull()
    expect(hierarchy.klassCode).toBeNull()
  })

  it('setHierarchyLine: klassCode をリセット', () => {
    useFilterStore.getState().setHierarchyDept('D1')
    useFilterStore.getState().setHierarchyKlass('K1')
    useFilterStore.getState().setHierarchyLine('L2')
    const hierarchy = useFilterStore.getState().hierarchy
    expect(hierarchy.deptCode).toBe('D1')
    expect(hierarchy.lineCode).toBe('L2')
    expect(hierarchy.klassCode).toBeNull()
  })

  it('setHierarchyKlass: dept/line を維持', () => {
    useFilterStore.getState().setHierarchyDept('D1')
    useFilterStore.getState().setHierarchyLine('L1')
    useFilterStore.getState().setHierarchyKlass('K1')
    const hierarchy = useFilterStore.getState().hierarchy
    expect(hierarchy.deptCode).toBe('D1')
    expect(hierarchy.lineCode).toBe('L1')
    expect(hierarchy.klassCode).toBe('K1')
  })

  it('setCategoryFilter / setDepartmentFilter', () => {
    useFilterStore.getState().setCategoryFilter('cat1')
    useFilterStore.getState().setDepartmentFilter('dept1')
    expect(useFilterStore.getState().categoryFilter).toBe('cat1')
    expect(useFilterStore.getState().departmentFilter).toBe('dept1')
  })

  it('resetDayRange: [1, endDay]', () => {
    useFilterStore.getState().resetDayRange(15)
    expect(useFilterStore.getState().dayRange).toEqual([1, 15])
  })

  it('resetAll: 全て初期値 + dayRange=[1, daysInMonth]', () => {
    useFilterStore.getState().setDayRange([5, 10])
    useFilterStore.getState().setCategoryFilter('x')
    useFilterStore.getState().resetAll(28)
    const state = useFilterStore.getState()
    expect(state.dayRange).toEqual([1, 28])
    expect(state.categoryFilter).toBeNull()
  })

  it('resetAll(): デフォルト dayRange=[1,31]', () => {
    useFilterStore.getState().resetAll()
    expect(useFilterStore.getState().dayRange).toEqual([1, 31])
  })
})

// ─── pageStore ──────────────────────────

describe('pageStore', () => {
  beforeEach(() => {
    // Clear all pages
    const pages = usePageStore.getState().pages
    for (const p of pages) {
      usePageStore.getState().removePage(p.id)
    }
  })

  it('初期状態 or reset 後: pages=空', () => {
    expect(usePageStore.getState().pages).toHaveLength(0)
  })

  it('addPage: 新ページ + path 自動生成', () => {
    const page = usePageStore.getState().addPage('マイページ')
    expect(page.label).toBe('マイページ')
    expect(page.path).toMatch(/^\/custom\/page_/)
    expect(page.defaultWidgetIds).toEqual([])
    expect(usePageStore.getState().pages).toHaveLength(1)
  })

  it('addPage: defaultWidgetIds 指定', () => {
    const page = usePageStore.getState().addPage('X', ['w1', 'w2'])
    expect(page.defaultWidgetIds).toEqual(['w1', 'w2'])
  })

  it('removePage: 指定 id を削除', () => {
    const a = usePageStore.getState().addPage('A')
    const b = usePageStore.getState().addPage('B')
    usePageStore.getState().removePage(a.id)
    const remaining = usePageStore.getState().pages
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(b.id)
  })

  it('renamePage: label 更新', () => {
    const page = usePageStore.getState().addPage('Old Name')
    usePageStore.getState().renamePage(page.id, 'New Name')
    const renamed = usePageStore.getState().pages.find((p) => p.id === page.id)
    expect(renamed?.label).toBe('New Name')
  })

  it('updatePageDefaults: widgetIds 更新', () => {
    const page = usePageStore.getState().addPage('A', ['w1'])
    usePageStore.getState().updatePageDefaults(page.id, ['w2', 'w3'])
    const updated = usePageStore.getState().pages.find((p) => p.id === page.id)
    expect(updated?.defaultWidgetIds).toEqual(['w2', 'w3'])
  })

  it('addPage: 一意な id を生成', () => {
    const a = usePageStore.getState().addPage('A')
    const b = usePageStore.getState().addPage('B')
    expect(a.id).not.toBe(b.id)
  })
})
