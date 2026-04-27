/**
 * EstimatedInventoryDetailChart.helpers.ts — helper tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  createFmt,
  AGG_LABELS,
  filterInventoryDayRange,
  filterNonEmptyInventoryRows,
  summarizeInventoryTotals,
  buildStoreInventoryEntries,
  buildComparisonInventoryData,
} from '../EstimatedInventoryDetailChart.helpers'
import type { InventoryDetailRow } from '@/application/hooks/calculation'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { Store, DailyRecord } from '@/domain/models/record'

describe('createFmt', () => {
  it('wraps a CurrencyFormatter as number → string function', () => {
    const base = ((v: number) => `¥${v}`) as unknown as import('../chartTheme').CurrencyFormatter
    const fmt = createFmt(base)
    expect(fmt(100)).toBe('¥100')
    expect(fmt(0)).toBe('¥0')
  })

  it('preserves per-call formatter behavior', () => {
    let called = 0
    const base = ((v: number) => {
      called++
      return `${v}!`
    }) as unknown as import('../chartTheme').CurrencyFormatter
    const fmt = createFmt(base)
    fmt(1)
    fmt(2)
    expect(called).toBe(2)
  })
})

describe('AGG_LABELS', () => {
  it('includes all aggregate label keys', () => {
    expect(AGG_LABELS.inventoryCost).toBe('在庫仕入原価')
    expect(AGG_LABELS.estCogs).toBe('推定原価')
    expect(AGG_LABELS.estimated).toBe('推定在庫')
  })

  it('returns undefined for unknown keys', () => {
    expect(AGG_LABELS.unknown).toBeUndefined()
  })
})

// ── Fixture helpers ────────────────────────────────────

function row(day: number, vals: Partial<InventoryDetailRow> = {}): InventoryDetailRow {
  return {
    day,
    sales: 0,
    coreSales: 0,
    grossSales: 0,
    inventoryCost: 0,
    estCogs: 0,
    costInclusionCost: 0,
    cumInventoryCost: 0,
    cumEstCogs: 0,
    estimated: 0,
    actual: null,
    ...vals,
  }
}

describe('filterInventoryDayRange', () => {
  const rows: readonly InventoryDetailRow[] = [row(1), row(5), row(10), row(15), row(20)]

  it('start..end 範囲の行だけを返す', () => {
    expect(filterInventoryDayRange(rows, 5, 15).map((r) => r.day)).toEqual([5, 10, 15])
  })

  it('境界値を含む（inclusive）', () => {
    expect(filterInventoryDayRange(rows, 10, 10).map((r) => r.day)).toEqual([10])
  })

  it('全範囲指定で全件返す', () => {
    expect(filterInventoryDayRange(rows, 1, 31)).toHaveLength(5)
  })

  it('範囲外の指定で空配列', () => {
    expect(filterInventoryDayRange(rows, 100, 200)).toEqual([])
  })

  it('start > end で空配列（交差なし）', () => {
    expect(filterInventoryDayRange(rows, 15, 5)).toEqual([])
  })
})

describe('filterNonEmptyInventoryRows', () => {
  it('sales > 0 または inventoryCost != 0 または estCogs != 0 の行だけ残す', () => {
    const rows: readonly InventoryDetailRow[] = [
      row(1, { sales: 100 }),
      row(2, { inventoryCost: 50 }),
      row(3, { estCogs: 30 }),
      row(4), // 全 0 → 除外
      row(5, { costInclusionCost: 10 }), // costInclusion は除外条件に入らない → 除外
    ]
    expect(filterNonEmptyInventoryRows(rows).map((r) => r.day)).toEqual([1, 2, 3])
  })

  it('負の inventoryCost（例: 移動出庫）も非ゼロとして残す', () => {
    expect(filterNonEmptyInventoryRows([row(1, { inventoryCost: -50 })]).map((r) => r.day)).toEqual(
      [1],
    )
  })

  it('負の estCogs も非ゼロとして残す', () => {
    expect(filterNonEmptyInventoryRows([row(1, { estCogs: -30 })]).map((r) => r.day)).toEqual([1])
  })

  it('sales=0 で他も全 0 なら除外', () => {
    expect(filterNonEmptyInventoryRows([row(1)])).toEqual([])
  })

  it('空配列で空配列を返す', () => {
    expect(filterNonEmptyInventoryRows([])).toEqual([])
  })
})

describe('summarizeInventoryTotals', () => {
  it('空配列で全 0 を返す', () => {
    expect(summarizeInventoryTotals([])).toEqual({
      sales: 0,
      coreSales: 0,
      grossSales: 0,
      invCost: 0,
      cogs: 0,
      cons: 0,
    })
  })

  it('6 フィールドを合算する', () => {
    const rows: readonly InventoryDetailRow[] = [
      row(1, {
        sales: 100,
        coreSales: 80,
        grossSales: 120,
        inventoryCost: 50,
        estCogs: 40,
        costInclusionCost: 5,
      }),
      row(2, {
        sales: 200,
        coreSales: 160,
        grossSales: 240,
        inventoryCost: 100,
        estCogs: 80,
        costInclusionCost: 10,
      }),
    ]
    expect(summarizeInventoryTotals(rows)).toEqual({
      sales: 300,
      coreSales: 240,
      grossSales: 360,
      invCost: 150,
      cogs: 120,
      cons: 15,
    })
  })

  it('負の値も合算される（移動出庫など）', () => {
    const rows: readonly InventoryDetailRow[] = [
      row(1, { sales: 100, inventoryCost: -50 }),
      row(2, { sales: 200, inventoryCost: 80 }),
    ]
    expect(summarizeInventoryTotals(rows)).toMatchObject({ sales: 300, invCost: 30 })
  })

  it('単行でも集計が動く', () => {
    const rows: readonly InventoryDetailRow[] = [row(1, { sales: 42 })]
    expect(summarizeInventoryTotals(rows).sales).toBe(42)
  })
})

// ── Store fixture helpers ──

function mkStore(id: string, name: string): Store {
  return { id, name, code: id } as Store
}

function mkResult(
  id: string,
  opts: Partial<StoreResult> & { openingInventory?: number | null } = {},
): StoreResult {
  return {
    storeId: id,
    openingInventory: opts.openingInventory ?? null,
    closingInventory: null,
    coreMarkupRate: 0.3,
    discountRate: 0,
    daily: new Map(),
    ...opts,
  } as unknown as StoreResult
}

describe('buildStoreInventoryEntries', () => {
  it('undefined 入力で空配列を返す（comparisonResults）', () => {
    expect(buildStoreInventoryEntries(undefined, new Map())).toEqual([])
  })

  it('undefined 入力で空配列を返す（stores）', () => {
    expect(buildStoreInventoryEntries([mkResult('s1')], undefined)).toEqual([])
  })

  it('stores map から name を引く、未解決は storeId で fallback', () => {
    const results = [mkResult('s1'), mkResult('s2')]
    const stores: ReadonlyMap<string, Store> = new Map([['s1', mkStore('s1', '店舗A')]])
    const entries = buildStoreInventoryEntries(results, stores)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toMatchObject({ storeId: 's1', name: '店舗A' })
    expect(entries[1]).toMatchObject({ storeId: 's2', name: 's2' }) // fallback
  })

  it('openingInventory=null → hasInventory=false', () => {
    const results = [
      mkResult('s1', { openingInventory: 1000 }),
      mkResult('s2', { openingInventory: null }),
    ]
    const stores: ReadonlyMap<string, Store> = new Map([
      ['s1', mkStore('s1', 'A')],
      ['s2', mkStore('s2', 'B')],
    ])
    const entries = buildStoreInventoryEntries(results, stores)
    expect(entries[0].hasInventory).toBe(true)
    expect(entries[1].hasInventory).toBe(false)
  })
})

describe('buildComparisonInventoryData', () => {
  // computeEstimatedInventoryDetails が参照する全フィールドを埋めた minimal record
  function mkDaily(day: number, sales: number, cost: number): [number, DailyRecord] {
    const zeroPair = { cost: 0, price: 0 }
    return [
      day,
      {
        day,
        sales,
        coreSales: sales,
        grossSales: sales,
        customers: 0,
        purchase: { cost, price: cost },
        interStoreIn: zeroPair,
        interStoreOut: zeroPair,
        interDepartmentIn: zeroPair,
        interDepartmentOut: zeroPair,
        flowers: zeroPair,
        directProduce: zeroPair,
        deliverySales: zeroPair,
        costInclusion: zeroPair,
        discountAbsolute: 0,
        discount: 0,
        discountEntries: [],
      } as unknown as DailyRecord,
    ]
  }

  it('比較対象 0 件で daysInMonth 分の day-only 行を返す', () => {
    const rows = buildComparisonInventoryData([], 3, 1, 3)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({ day: 1 })
    expect(rows[2]).toEqual({ day: 3 })
  })

  it('hasInventory=false の店舗は null 埋め（推定在庫）/ 0 埋め（原価系）', () => {
    const entry = {
      storeId: 's1',
      name: '店舗A',
      hasInventory: false,
      result: mkResult('s1'),
    }
    const rows = buildComparisonInventoryData([entry], 2, 1, 2)
    expect(rows[0]['店舗A_推定在庫']).toBeNull()
    expect(rows[0]['店舗A_仕入原価']).toBe(0)
    expect(rows[0]['店舗A_推定原価']).toBe(0)
  })

  it('rangeStart/rangeEnd で day 範囲をキャップする', () => {
    const rows = buildComparisonInventoryData([], 10, 3, 7)
    expect(rows.map((r) => r.day)).toEqual([3, 4, 5, 6, 7])
  })

  it('hasInventory=true の店舗は推定在庫行が埋まる（computeEstimatedInventoryDetails 連携）', () => {
    const result = mkResult('s1', {
      openingInventory: 1000,
      closingInventory: null,
      coreMarkupRate: 0.3,
      discountRate: 0,
      daily: new Map([mkDaily(1, 100, 60), mkDaily(2, 200, 120)]),
    })
    const entry = {
      storeId: 's1',
      name: '店舗A',
      hasInventory: true,
      result,
    }
    const rows = buildComparisonInventoryData([entry], 2, 1, 2)
    expect(rows).toHaveLength(2)
    // 各日に 3 キー（推定在庫 / 仕入原価 / 推定原価）が存在
    expect(rows[0]).toHaveProperty('店舗A_推定在庫')
    expect(rows[0]).toHaveProperty('店舗A_仕入原価')
    expect(rows[0]).toHaveProperty('店舗A_推定原価')
    // 仕入原価は day=1 の cost=60
    expect(rows[0]['店舗A_仕入原価']).toBe(60)
    expect(rows[1]['店舗A_仕入原価']).toBe(120)
  })

  it('複数店舗は独立キー（name 衝突なし前提）で並ぶ', () => {
    const r1 = mkResult('s1', {
      openingInventory: 1000,
      daily: new Map([mkDaily(1, 100, 60)]),
    })
    const r2 = mkResult('s2', {
      openingInventory: 500,
      daily: new Map([mkDaily(1, 50, 30)]),
    })
    const rows = buildComparisonInventoryData(
      [
        { storeId: 's1', name: 'A', hasInventory: true, result: r1 },
        { storeId: 's2', name: 'B', hasInventory: true, result: r2 },
      ],
      1,
      1,
      1,
    )
    expect(rows[0]).toHaveProperty('A_推定在庫')
    expect(rows[0]).toHaveProperty('B_推定在庫')
  })
})
