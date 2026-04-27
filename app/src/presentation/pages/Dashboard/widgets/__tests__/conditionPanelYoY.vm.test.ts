/**
 * conditionPanelYoY.vm — pure helper tests
 *
 * 検証対象（依存軽量な pure 関数のみ）:
 * - computeStorePrevSales / computeStorePrevCustomers: storeContributions フィルタ集約
 * - buildDailyYoYRows: StoreResult.daily + dailyMapping の ComparisonPoint 合成
 * - buildStoreDailyYoYRows: 店舗別日別集約（indexContributionsByDay 経由）
 * - buildItemsYoYStoreDailyRows: 当年 CTS × 前年 storeContributions の店舗別日別合成
 *
 * metricSignal / SIGNAL_COLORS / ConditionSummaryConfig に依存する Detail VM
 * ビルダー（buildSalesYoYDetailVm 等）は conditionPanelSalesDetail.vm.test の
 * 方針（= ここではテストしない）に倣って除外する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  computeStorePrevSales,
  computeStorePrevCustomers,
  buildDailyYoYRows,
  buildStoreDailyYoYRows,
  buildItemsYoYStoreDailyRows,
} from '../conditionPanelYoY.vm'
import type {
  PrevYearMonthlyKpi,
  PrevYearMonthlyKpiEntry,
  StoreContribution,
  DayMappingRow,
} from '@/features/comparison/application/comparisonTypes'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { DailyRecord } from '@/domain/models/record'
import type { CurrentCtsQuantity } from '../types'

// ── Mock ヘルパー ───────────────────────────────────────

function contrib(
  storeId: string,
  mappedDay: number,
  vals: Partial<Pick<StoreContribution, 'sales' | 'customers' | 'discount' | 'ctsQuantity'>>,
): StoreContribution {
  return {
    storeId,
    originalDay: mappedDay,
    mappedDay,
    sales: vals.sales ?? 0,
    customers: vals.customers ?? 0,
    discount: vals.discount ?? 0,
    ctsQuantity: vals.ctsQuantity ?? 0,
  }
}

function mapping(
  currentDay: number,
  vals: Partial<Pick<DayMappingRow, 'prevSales' | 'prevCustomers' | 'prevCtsQuantity'>>,
): DayMappingRow {
  return {
    prevDay: currentDay,
    prevMonth: 3,
    prevYear: 2024,
    currentDay,
    prevSales: vals.prevSales ?? 0,
    prevCustomers: vals.prevCustomers ?? 0,
    prevCtsQuantity: vals.prevCtsQuantity ?? 0,
  }
}

function makeKpi(
  opts: {
    hasPrevYear?: boolean
    storeContributions?: readonly StoreContribution[]
    dailyMapping?: readonly DayMappingRow[]
  } = {},
): PrevYearMonthlyKpi {
  const sameDow: PrevYearMonthlyKpiEntry = {
    sales: 0,
    customers: 0,
    transactionValue: 0,
    ctsQuantity: 0,
    dailyMapping: opts.dailyMapping ?? [],
    storeContributions: opts.storeContributions ?? [],
  }
  return {
    hasPrevYear: opts.hasPrevYear ?? true,
    sameDow,
    sameDate: sameDow,
    monthlyTotal: { sales: 0, customers: 0, transactionValue: 0, ctsQuantity: 0 },
    sourceYear: 2024,
    sourceMonth: 3,
    dowOffset: 0,
  }
}

function daily(day: number, sales: number, customers: number): [number, DailyRecord] {
  return [
    day,
    {
      day,
      sales,
      customers,
      coreSales: sales,
      grossSales: sales,
      discount: 0,
      discountEntries: [],
      cost: 0,
      price: 0,
      flowerSalesPrice: 0,
      flowerCost: 0,
      directProduceSalesPrice: 0,
      directProduceCost: 0,
      costInclusionCost: 0,
      categorySales: new Map(),
      categoryCost: new Map(),
      transferDetails: { interStoreIn: [], interStoreOut: [], interDeptIn: [], interDeptOut: [] },
      supplierTotals: new Map(),
    } as unknown as DailyRecord,
  ]
}

function makeStoreResult(entries: readonly [number, DailyRecord][]): StoreResult {
  return { daily: new Map(entries) } as unknown as StoreResult
}

// ── computeStorePrevSales / computeStorePrevCustomers ─────

describe('computeStorePrevSales', () => {
  it('hasPrevYear=false のとき 0 を返す', () => {
    const kpi = makeKpi({ hasPrevYear: false })
    expect(computeStorePrevSales(kpi, 's1')).toBe(0)
  })

  it('指定店舗の sales を合算する', () => {
    const kpi = makeKpi({
      storeContributions: [
        contrib('s1', 1, { sales: 100 }),
        contrib('s1', 2, { sales: 200 }),
        contrib('s2', 1, { sales: 999 }),
      ],
    })
    expect(computeStorePrevSales(kpi, 's1')).toBe(300)
  })

  it('maxDay で日をキャップする', () => {
    const kpi = makeKpi({
      storeContributions: [
        contrib('s1', 1, { sales: 100 }),
        contrib('s1', 5, { sales: 200 }),
        contrib('s1', 10, { sales: 300 }),
      ],
    })
    expect(computeStorePrevSales(kpi, 's1', 5)).toBe(300)
    expect(computeStorePrevSales(kpi, 's1', 1)).toBe(100)
  })

  it('該当店舗がない場合は 0', () => {
    const kpi = makeKpi({
      storeContributions: [contrib('s1', 1, { sales: 100 })],
    })
    expect(computeStorePrevSales(kpi, 'unknown')).toBe(0)
  })
})

describe('computeStorePrevCustomers', () => {
  it('hasPrevYear=false のとき 0 を返す', () => {
    const kpi = makeKpi({ hasPrevYear: false })
    expect(computeStorePrevCustomers(kpi, 's1')).toBe(0)
  })

  it('指定店舗の customers を合算する', () => {
    const kpi = makeKpi({
      storeContributions: [
        contrib('s1', 1, { customers: 10 }),
        contrib('s1', 2, { customers: 20 }),
        contrib('s2', 1, { customers: 999 }),
      ],
    })
    expect(computeStorePrevCustomers(kpi, 's1')).toBe(30)
  })

  it('maxDay を反映する', () => {
    const kpi = makeKpi({
      storeContributions: [
        contrib('s1', 1, { customers: 5 }),
        contrib('s1', 3, { customers: 7 }),
        contrib('s1', 10, { customers: 99 }),
      ],
    })
    expect(computeStorePrevCustomers(kpi, 's1', 3)).toBe(12)
  })
})

// ── buildDailyYoYRows ──────────────────────────────────

describe('buildDailyYoYRows', () => {
  it('hasPrevYear=false で空配列を返す', () => {
    const sr = makeStoreResult([daily(1, 100, 10)])
    const kpi = makeKpi({ hasPrevYear: false })
    expect(buildDailyYoYRows(sr, kpi)).toEqual([])
  })

  it('当年 daily と前年 dailyMapping を突き合わせる', () => {
    const sr = makeStoreResult([daily(1, 100, 10), daily(2, 200, 20)])
    const kpi = makeKpi({
      dailyMapping: [
        mapping(1, { prevSales: 80, prevCustomers: 8 }),
        mapping(2, { prevSales: 150, prevCustomers: 15 }),
      ],
    })
    const rows = buildDailyYoYRows(sr, kpi)
    expect(rows).toEqual([
      { day: 1, currentSales: 100, prevSales: 80, currentCustomers: 10, prevCustomers: 8 },
      { day: 2, currentSales: 200, prevSales: 150, currentCustomers: 20, prevCustomers: 15 },
    ])
  })

  it('前年に対応日がない日は prev=0 で埋める', () => {
    const sr = makeStoreResult([daily(1, 100, 10), daily(2, 200, 20)])
    const kpi = makeKpi({
      dailyMapping: [mapping(1, { prevSales: 80, prevCustomers: 8 })],
    })
    const rows = buildDailyYoYRows(sr, kpi)
    expect(rows[1]).toEqual({
      day: 2,
      currentSales: 200,
      prevSales: 0,
      currentCustomers: 20,
      prevCustomers: 0,
    })
  })

  it('daily の day 順に並ぶ（Map 挿入順に依存しない）', () => {
    const sr = makeStoreResult([daily(3, 300, 30), daily(1, 100, 10), daily(2, 200, 20)])
    const kpi = makeKpi({ dailyMapping: [] })
    const rows = buildDailyYoYRows(sr, kpi)
    expect(rows.map((r) => r.day)).toEqual([1, 2, 3])
  })
})

// ── buildStoreDailyYoYRows ─────────────────────────────

describe('buildStoreDailyYoYRows', () => {
  it('hasPrevYear=false で空配列', () => {
    const sr = makeStoreResult([daily(1, 100, 10)])
    const kpi = makeKpi({ hasPrevYear: false })
    expect(buildStoreDailyYoYRows(sr, kpi, 's1')).toEqual([])
  })

  it('storeId フィルタで前年 storeContributions を絞り込み、当年 daily と合成する', () => {
    const sr = makeStoreResult([daily(1, 100, 10), daily(2, 200, 20)])
    const kpi = makeKpi({
      storeContributions: [
        contrib('s1', 1, { sales: 80, customers: 8 }),
        contrib('s1', 2, { sales: 150, customers: 15 }),
        contrib('s2', 1, { sales: 999, customers: 99 }), // 別店舗は混入しない
      ],
    })
    const rows = buildStoreDailyYoYRows(sr, kpi, 's1')
    expect(rows).toEqual([
      { day: 1, currentSales: 100, prevSales: 80, currentCustomers: 10, prevCustomers: 8 },
      { day: 2, currentSales: 200, prevSales: 150, currentCustomers: 20, prevCustomers: 15 },
    ])
  })

  it('前年に該当日がない場合 prev=0', () => {
    const sr = makeStoreResult([daily(1, 100, 10)])
    const kpi = makeKpi({
      storeContributions: [contrib('s1', 2, { sales: 80, customers: 8 })],
    })
    const rows = buildStoreDailyYoYRows(sr, kpi, 's1')
    expect(rows).toEqual([
      { day: 1, currentSales: 100, prevSales: 0, currentCustomers: 10, prevCustomers: 0 },
    ])
  })
})

// ── buildItemsYoYStoreDailyRows ────────────────────────

describe('buildItemsYoYStoreDailyRows', () => {
  function cts(
    total: number,
    byDay: [number, number][],
    byStoreDay: [string, number][] = [],
  ): CurrentCtsQuantity {
    return {
      total,
      byStore: new Map(),
      byDay: new Map(byDay),
      byStoreDay: new Map(byStoreDay),
    }
  }

  it('storeId=null で全店集約の日別 currentCts を返す', () => {
    const current = cts(300, [
      [1, 100],
      [2, 200],
    ])
    const kpi = makeKpi({
      storeContributions: [
        contrib('s1', 1, { ctsQuantity: 50 }),
        contrib('s1', 2, { ctsQuantity: 80 }),
      ],
    })
    const rows = buildItemsYoYStoreDailyRows(current, kpi, 31, null)
    expect(rows).toEqual([
      { day: 1, currentQty: 100, prevQty: 50 },
      { day: 2, currentQty: 200, prevQty: 80 },
    ])
  })

  it('effectiveDay を超える当年は除外する', () => {
    const current = cts(300, [
      [1, 100],
      [15, 200],
    ])
    const kpi = makeKpi({ storeContributions: [] })
    const rows = buildItemsYoYStoreDailyRows(current, kpi, 10, null)
    expect(rows).toEqual([{ day: 1, currentQty: 100, prevQty: 0 }])
  })

  it('storeId 指定時は byStoreDay を当年値として使う', () => {
    const current = cts(
      200,
      [],
      [
        ['s1:1', 100],
        ['s1:2', 60],
        ['s2:1', 999], // 別店舗は混入しない
      ],
    )
    const kpi = makeKpi({
      storeContributions: [
        contrib('s1', 1, { ctsQuantity: 40 }),
        contrib('s2', 1, { ctsQuantity: 99 }), // s1 のみで集約
      ],
    })
    const rows = buildItemsYoYStoreDailyRows(current, kpi, 31, 's1')
    expect(rows).toEqual([
      { day: 1, currentQty: 100, prevQty: 40 },
      { day: 2, currentQty: 60, prevQty: 0 },
    ])
  })

  it('前年側の day=0 / effectiveDay 超過は除外する', () => {
    const current = cts(0, [])
    const kpi = makeKpi({
      storeContributions: [
        contrib('s1', 0, { ctsQuantity: 99 }),
        contrib('s1', 5, { ctsQuantity: 50 }),
        contrib('s1', 15, { ctsQuantity: 99 }),
      ],
    })
    const rows = buildItemsYoYStoreDailyRows(current, kpi, 10, 's1')
    expect(rows).toEqual([{ day: 5, currentQty: 0, prevQty: 50 }])
  })

  it('当年/前年を両方持つ日は合成される', () => {
    const current = cts(100, [[3, 100]])
    const kpi = makeKpi({
      storeContributions: [contrib('s1', 3, { ctsQuantity: 70 })],
    })
    const rows = buildItemsYoYStoreDailyRows(current, kpi, 31, null)
    expect(rows).toEqual([{ day: 3, currentQty: 100, prevQty: 70 }])
  })
})
