import { describe, it, expect } from 'vitest'
import type { SalesAnalysisContext } from '../SalesAnalysisContext'
import { buildSalesAnalysisContext, deriveChildContext } from '../SalesAnalysisContext'
import {
  deriveNodeContext,
  buildRootNodeContext,
  deriveDeptPatternContext,
  deriveCategoryDrilldownContext,
  DEFAULT_TOP_DEPARTMENT_POLICY,
} from '../AnalysisNodeContext'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { CalendarDate } from '@/domain/models/CalendarDate'

// ── テスト用ヘルパー ────────────────────────────────────

function parseDate(s: string): CalendarDate {
  const [y, m, d] = s.split('-').map(Number)
  return { year: y, month: m, day: d }
}

function makeDateRange(from: string, to: string): DateRange {
  return { from: parseDate(from), to: parseDate(to) }
}

function makeBaseContext(overrides?: Partial<SalesAnalysisContext>): SalesAnalysisContext {
  return buildSalesAnalysisContext(
    overrides?.dateRange ?? makeDateRange('2025-03-01', '2025-03-31'),
    overrides?.selectedStoreIds ?? new Set(['store-1']),
    overrides?.comparisonScope,
    overrides?.selectedDayRange
      ? { startDay: overrides.selectedDayRange.startDay, endDay: overrides.selectedDayRange.endDay }
      : undefined,
    overrides?.hierarchy,
  )
}

const COMPARISON_A: PrevYearScope = {
  dateRange: makeDateRange('2024-03-01', '2024-03-31'),
  totalCustomers: 1000,
  dowOffset: 0,
}

// ── buildRootNodeContext ─────────────────────────────────

describe('buildRootNodeContext', () => {
  it('ルートノードを構築する', () => {
    const base = makeBaseContext()
    const node = buildRootNodeContext(base, 'daily-sales')

    expect(node.nodeType).toBe('daily-sales')
    expect(node.parentNodeType).toBeUndefined()
    expect(node.focus).toBeUndefined()
    expect(node.topDepartmentPolicy).toBeUndefined()
    expect(node.base).toBe(base) // 同一参照
  })
})

// ── deriveNodeContext ────────────────────────────────────

describe('deriveNodeContext', () => {
  it('親ノードから子ノードを導出する（base は不変参照）', () => {
    const base = makeBaseContext({ comparisonScope: COMPARISON_A })
    const parent = buildRootNodeContext(base, 'daily-sales')

    const child = deriveNodeContext(parent, 'time-slot')

    expect(child.nodeType).toBe('time-slot')
    expect(child.parentNodeType).toBe('daily-sales')
    expect(child.base).toBe(parent.base) // base は同一参照
    expect(child.focus).toBeUndefined()
  })

  it('focus を付与できる', () => {
    const parent = buildRootNodeContext(makeBaseContext(), 'daily-sales')

    const child = deriveNodeContext(parent, 'time-slot', {
      focus: { kind: 'day-range', startDay: 5, endDay: 10 },
    })

    expect(child.focus).toEqual({ kind: 'day-range', startDay: 5, endDay: 10 })
  })

  it('overrideBase で派生済み文脈を渡せる', () => {
    const base = makeBaseContext({ comparisonScope: COMPARISON_A })
    const parent = buildRootNodeContext(base, 'daily-sales')

    const drillRange = makeDateRange('2025-03-05', '2025-03-10')
    const childBase = deriveChildContext(parent.base, drillRange)
    const child = deriveNodeContext(parent, 'time-slot', { overrideBase: childBase })

    expect(child.base.dateRange).toEqual(drillRange)
    expect(child.base).not.toBe(parent.base) // 別オブジェクト
    // comparisonScope は継承される
    expect(child.base.comparisonScope).toBe(COMPARISON_A)
  })
})

// ── authoritative comparison scope 継承テスト ─────────────

describe('authoritative comparison scope 継承', () => {
  it('子/孫文脈で comparisonScope が再計算されない', () => {
    const base = makeBaseContext({ comparisonScope: COMPARISON_A })
    const root = buildRootNodeContext(base, 'daily-sales')

    // 子ノード: dateRange を変更しても comparisonScope は親のまま
    const drillRange = makeDateRange('2025-03-05', '2025-03-10')
    const childBase = deriveChildContext(root.base, drillRange)
    const child = deriveNodeContext(root, 'time-slot', { overrideBase: childBase })

    expect(child.base.comparisonScope).toBe(COMPARISON_A)
    expect(child.base.dateRange).toEqual(drillRange)

    // 孫ノード: さらに派生しても comparisonScope は最初の親のまま
    const grandchild = deriveDeptPatternContext(child, DEFAULT_TOP_DEPARTMENT_POLICY)

    expect(grandchild.base.comparisonScope).toBe(COMPARISON_A)
    expect(grandchild.base.dateRange).toEqual(drillRange) // 子のDateRangeを継承
  })

  it('selectedStoreIds は親子孫で一貫する', () => {
    const storeIds = new Set(['store-1', 'store-2'])
    const base = makeBaseContext({ selectedStoreIds: storeIds })
    const root = buildRootNodeContext(base, 'daily-sales')

    const child = deriveNodeContext(root, 'time-slot')
    const grandchild = deriveDeptPatternContext(child, DEFAULT_TOP_DEPARTMENT_POLICY)

    expect(child.base.selectedStoreIds).toBe(storeIds)
    expect(grandchild.base.selectedStoreIds).toBe(storeIds)
  })
})

// ── deriveDeptPatternContext ─────────────────────────────

describe('deriveDeptPatternContext', () => {
  it('部門別時間帯パターンの孫文脈を正しく導出する', () => {
    const base = makeBaseContext({ comparisonScope: COMPARISON_A })
    const root = buildRootNodeContext(base, 'daily-sales')
    const timeSlot = deriveNodeContext(root, 'time-slot')

    const deptPattern = deriveDeptPatternContext(timeSlot, {
      count: 5,
      criterion: 'current-total-sales',
      includeComparison: false,
    })

    expect(deptPattern.nodeType).toBe('time-slot-department-pattern')
    expect(deptPattern.parentNodeType).toBe('time-slot')
    expect(deptPattern.topDepartmentPolicy).toEqual({
      count: 5,
      criterion: 'current-total-sales',
      includeComparison: false,
    })
    expect(deptPattern.base).toBe(timeSlot.base) // 不変参照
  })
})

// ── deriveCategoryDrilldownContext ────────────────────────

describe('deriveCategoryDrilldownContext', () => {
  it('カテゴリードリルダウンの子文脈を正しく導出する', () => {
    const base = makeBaseContext({ comparisonScope: COMPARISON_A })
    const root = buildRootNodeContext(base, 'category-trend')

    const drilldown = deriveCategoryDrilldownContext(root, {
      level: 'department',
      code: 'D01',
      name: '食品',
    })

    expect(drilldown.nodeType).toBe('category-drilldown')
    expect(drilldown.parentNodeType).toBe('category-trend')
    expect(drilldown.focus).toEqual({
      kind: 'category',
      level: 'department',
      code: 'D01',
      name: '食品',
    })
    expect(drilldown.base).toBe(root.base) // 不変参照
    expect(drilldown.base.comparisonScope).toBe(COMPARISON_A)
  })
})

// ── buildSalesAnalysisContext 純粋関数テスト ──────────────

describe('buildSalesAnalysisContext', () => {
  it('hierarchy 未指定でデフォルト補完される', () => {
    const ctx = buildSalesAnalysisContext(
      makeDateRange('2025-03-01', '2025-03-31'),
      new Set(['store-1']),
    )
    expect(ctx.hierarchy).toEqual({})
  })

  it('selectedDayRange 未指定で undefined', () => {
    const ctx = buildSalesAnalysisContext(
      makeDateRange('2025-03-01', '2025-03-31'),
      new Set(['store-1']),
    )
    expect(ctx.selectedDayRange).toBeUndefined()
  })

  it('comparisonScope がそのまま保持される', () => {
    const ctx = buildSalesAnalysisContext(
      makeDateRange('2025-03-01', '2025-03-31'),
      new Set(['store-1']),
      COMPARISON_A,
    )
    expect(ctx.comparisonScope).toBe(COMPARISON_A)
  })
})

// ── deriveChildContext 純粋関数テスト ─────────────────────

describe('deriveChildContext', () => {
  it('selectedStoreIds を継承する', () => {
    const storeIds = new Set(['store-1', 'store-2'])
    const parent = makeBaseContext({ selectedStoreIds: storeIds })
    const child = deriveChildContext(parent, makeDateRange('2025-03-05', '2025-03-10'))

    expect(child.selectedStoreIds).toBe(storeIds)
  })

  it('hierarchy を継承する', () => {
    const hierarchy = { deptCode: 'D01' }
    const parent = makeBaseContext({ hierarchy })
    const child = deriveChildContext(parent, makeDateRange('2025-03-05', '2025-03-10'))

    expect(child.hierarchy).toEqual(hierarchy)
  })

  it('dateRange を子用に上書きする', () => {
    const parent = makeBaseContext()
    const drillRange = makeDateRange('2025-03-05', '2025-03-10')
    const child = deriveChildContext(parent, drillRange)

    expect(child.dateRange).toEqual(drillRange)
    expect(child.dateRange).not.toEqual(parent.dateRange)
  })

  it('comparisonScope は親指定がなければ継承', () => {
    const parent = makeBaseContext({ comparisonScope: COMPARISON_A })
    const child = deriveChildContext(parent, makeDateRange('2025-03-05', '2025-03-10'))

    expect(child.comparisonScope).toBe(COMPARISON_A)
  })

  it('comparisonScope は明示的に上書き可能', () => {
    const parent = makeBaseContext({ comparisonScope: COMPARISON_A })
    const newScope: PrevYearScope = {
      dateRange: makeDateRange('2024-03-05', '2024-03-10'),
      totalCustomers: 500,
      dowOffset: 0,
    }
    const child = deriveChildContext(parent, makeDateRange('2025-03-05', '2025-03-10'), newScope)

    expect(child.comparisonScope).toBe(newScope)
    expect(child.comparisonScope).not.toBe(COMPARISON_A)
  })
})
