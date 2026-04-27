/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  aggregateFlows,
  buildTransferPivot,
  aggregateByItem,
  aggregateByAccount,
  buildFlowGroups,
  buildPairDailyData,
  calculateDailyTotals,
  buildItemDetailData,
  buildDailyCostInclusionData,
} from '../useCostDetailData.helpers'
import type { DailyRecord } from '@/domain/models/record'
import type { Store } from '@/domain/models/Store'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { FlowEntry, ItemAggregate } from '../useCostDetailData.types'

// ─── Helpers for building test data ────────────────────────

function makeStoreMap(stores: { id: string; name: string }[]): ReadonlyMap<string, Store> {
  const m = new Map<string, Store>()
  for (const s of stores) m.set(s.id, { id: s.id, name: s.name } as unknown as Store)
  return m
}

function makeDailyRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    interStoreIn: { cost: 0, price: 0 },
    interStoreOut: { cost: 0, price: 0 },
    interDepartmentIn: { cost: 0, price: 0 },
    interDepartmentOut: { cost: 0, price: 0 },
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
    costInclusion: { cost: 0, items: [] },
    supplierBreakdown: new Map(),
    ...overrides,
  } as unknown as DailyRecord
}

// ─── aggregateFlows ────────────────────────────────────────

describe('aggregateFlows', () => {
  it('returns empty array when no days', () => {
    expect(aggregateFlows([], 'interStoreIn', 'interStoreOut', new Map())).toEqual([])
  })

  it('aggregates entries and looks up store names', () => {
    const stores = makeStoreMap([
      { id: 'A', name: 'Store A' },
      { id: 'B', name: 'Store B' },
    ])
    const rec = makeDailyRecord({
      transferBreakdown: {
        interStoreIn: [{ fromStoreId: 'A', toStoreId: 'B', cost: 100, price: 120 }],
        interStoreOut: [{ fromStoreId: 'A', toStoreId: 'B', cost: 50, price: 60 }],
        interDepartmentIn: [],
        interDepartmentOut: [],
      },
    } as unknown as Partial<DailyRecord>)
    const result = aggregateFlows([[1, rec]], 'interStoreIn', 'interStoreOut', stores)
    expect(result).toHaveLength(1)
    expect(result[0].from).toBe('A')
    expect(result[0].to).toBe('B')
    expect(result[0].fromName).toBe('Store A')
    expect(result[0].toName).toBe('Store B')
    expect(result[0].cost).toBe(150)
    expect(result[0].price).toBe(180)
  })

  it('falls back to id when store not found', () => {
    const rec = makeDailyRecord({
      transferBreakdown: {
        interStoreIn: [{ fromStoreId: 'X', toStoreId: 'Y', cost: 10, price: 20 }],
        interStoreOut: [],
        interDepartmentIn: [],
        interDepartmentOut: [],
      },
    } as unknown as Partial<DailyRecord>)
    const result = aggregateFlows([[1, rec]], 'interStoreIn', 'interStoreOut', new Map())
    expect(result[0].fromName).toBe('X')
    expect(result[0].toName).toBe('Y')
  })

  it('sorts by absolute cost descending', () => {
    const rec = makeDailyRecord({
      transferBreakdown: {
        interStoreIn: [
          { fromStoreId: 'A', toStoreId: 'B', cost: 50, price: 0 },
          { fromStoreId: 'C', toStoreId: 'D', cost: -200, price: 0 },
          { fromStoreId: 'E', toStoreId: 'F', cost: 100, price: 0 },
        ],
        interStoreOut: [],
        interDepartmentIn: [],
        interDepartmentOut: [],
      },
    } as unknown as Partial<DailyRecord>)
    const result = aggregateFlows([[1, rec]], 'interStoreIn', 'interStoreOut', new Map())
    expect(result.map((f) => f.from)).toEqual(['C', 'E', 'A'])
  })
})

// ─── buildTransferPivot ────────────────────────────────────

describe('buildTransferPivot', () => {
  it('returns empty pivot when no days', () => {
    const pivot = buildTransferPivot([], 'interStoreIn', 'interStoreOut', new Map())
    expect(pivot.stores).toEqual([])
    expect(pivot.rows).toEqual([])
    expect(pivot.totals.inCost).toBe(0)
    expect(pivot.totals.net).toBe(0)
  })

  it('skips rows with no in/out cost', () => {
    const rec = makeDailyRecord()
    const pivot = buildTransferPivot([[1, rec]], 'interStoreIn', 'interStoreOut', new Map())
    expect(pivot.rows).toHaveLength(0)
  })

  it('builds rows and totals for transfers', () => {
    const stores = makeStoreMap([{ id: 'P', name: 'Partner' }])
    const rec = makeDailyRecord({
      interStoreIn: { cost: 100, price: 120 },
      interStoreOut: { cost: 50, price: 60 },
      transferBreakdown: {
        interStoreIn: [{ fromStoreId: 'P', toStoreId: 'SELF', cost: 100, price: 120 }],
        interStoreOut: [{ fromStoreId: 'SELF', toStoreId: 'P', cost: 50, price: 60 }],
        interDepartmentIn: [],
        interDepartmentOut: [],
      },
    } as unknown as Partial<DailyRecord>)
    const pivot = buildTransferPivot([[5, rec]], 'interStoreIn', 'interStoreOut', stores)
    expect(pivot.stores).toHaveLength(1)
    expect(pivot.stores[0].storeName).toBe('Partner')
    expect(pivot.rows).toHaveLength(1)
    expect(pivot.rows[0].day).toBe(5)
    expect(pivot.rows[0].inCost).toBe(100)
    expect(pivot.rows[0].outCost).toBe(50)
    expect(pivot.rows[0].net).toBe(150)
    expect(pivot.rows[0].cells['P'].cost).toBe(150)
    expect(pivot.totals.inCost).toBe(100)
    expect(pivot.totals.outCost).toBe(50)
    expect(pivot.totals.net).toBe(150)
    expect(pivot.totals.byStore['P'].cost).toBe(150)
  })
})

// ─── aggregateByItem ──────────────────────────────────────

describe('aggregateByItem', () => {
  it('returns empty when no days', () => {
    expect(aggregateByItem([])).toEqual([])
  })

  it('aggregates same item across days and counts unique days', () => {
    const rec1 = makeDailyRecord({
      costInclusion: {
        cost: 0,
        items: [{ itemCode: 'X', itemName: 'Item X', accountCode: 'A1', quantity: 5, cost: 100 }],
      },
    } as unknown as Partial<DailyRecord>)
    const rec2 = makeDailyRecord({
      costInclusion: {
        cost: 0,
        items: [
          { itemCode: 'X', itemName: 'Item X', accountCode: 'A1', quantity: 3, cost: 60 },
          { itemCode: 'Y', itemName: 'Item Y', accountCode: 'A2', quantity: 2, cost: 40 },
        ],
      },
    } as unknown as Partial<DailyRecord>)
    const result = aggregateByItem([
      [1, rec1],
      [2, rec2],
    ])
    expect(result).toHaveLength(2)
    // Sorted by totalCost desc: X=160, Y=40
    expect(result[0].itemCode).toBe('X')
    expect(result[0].totalQuantity).toBe(8)
    expect(result[0].totalCost).toBe(160)
    expect(result[0].dayCount).toBe(2)
    expect(result[1].itemCode).toBe('Y')
    expect(result[1].totalCost).toBe(40)
    expect(result[1].dayCount).toBe(1)
  })
})

// ─── aggregateByAccount ───────────────────────────────────

describe('aggregateByAccount', () => {
  it('returns empty for empty items', () => {
    expect(aggregateByAccount([])).toEqual([])
  })

  it('groups items by accountCode sorted by totalCost desc', () => {
    const items: ItemAggregate[] = [
      {
        itemCode: 'X',
        itemName: 'X',
        accountCode: 'A',
        totalQuantity: 1,
        totalCost: 100,
        dayCount: 1,
      },
      {
        itemCode: 'Y',
        itemName: 'Y',
        accountCode: 'A',
        totalQuantity: 1,
        totalCost: 50,
        dayCount: 1,
      },
      {
        itemCode: 'Z',
        itemName: 'Z',
        accountCode: 'B',
        totalQuantity: 1,
        totalCost: 200,
        dayCount: 1,
      },
    ]
    const result = aggregateByAccount(items)
    expect(result).toHaveLength(2)
    expect(result[0].accountCode).toBe('B')
    expect(result[0].totalCost).toBe(200)
    expect(result[0].itemCount).toBe(1)
    expect(result[1].accountCode).toBe('A')
    expect(result[1].totalCost).toBe(150)
    expect(result[1].itemCount).toBe(2)
  })
})

// ─── buildFlowGroups ──────────────────────────────────────

describe('buildFlowGroups', () => {
  it('returns empty for empty flows', () => {
    expect(buildFlowGroups([])).toEqual([])
  })

  it('groups flows by from and sorts by abs totalCost desc', () => {
    const flows: FlowEntry[] = [
      { from: 'A', to: 'X', fromName: 'Store A', toName: 'X', cost: 100, price: 120 },
      { from: 'A', to: 'Y', fromName: 'Store A', toName: 'Y', cost: 50, price: 60 },
      { from: 'B', to: 'Z', fromName: 'Store B', toName: 'Z', cost: -300, price: 0 },
    ]
    const groups = buildFlowGroups(flows)
    expect(groups).toHaveLength(2)
    // B has abs 300, A has 150
    expect(groups[0].fromId).toBe('B')
    expect(groups[0].totalCost).toBe(-300)
    expect(groups[0].entries).toHaveLength(1)
    expect(groups[1].fromId).toBe('A')
    expect(groups[1].entries).toHaveLength(2)
    expect(groups[1].totalCost).toBe(150)
    expect(groups[1].totalPrice).toBe(180)
  })
})

// ─── buildPairDailyData ───────────────────────────────────

describe('buildPairDailyData', () => {
  it('returns null when selectedPair is null', () => {
    expect(buildPairDailyData(null, [], 'interStoreIn', 'interStoreOut')).toBeNull()
  })

  it('returns empty array when no matches', () => {
    const rec = makeDailyRecord({
      transferBreakdown: {
        interStoreIn: [{ fromStoreId: 'A', toStoreId: 'B', cost: 10, price: 20 }],
        interStoreOut: [],
        interDepartmentIn: [],
        interDepartmentOut: [],
      },
    } as unknown as Partial<DailyRecord>)
    const result = buildPairDailyData('X->Y', [[1, rec]], 'interStoreIn', 'interStoreOut')
    expect(result).toEqual([])
  })

  it('sums cost/price for matching pair and filters zero rows', () => {
    const rec1 = makeDailyRecord({
      transferBreakdown: {
        interStoreIn: [{ fromStoreId: 'A', toStoreId: 'B', cost: 100, price: 120 }],
        interStoreOut: [{ fromStoreId: 'A', toStoreId: 'B', cost: 50, price: 60 }],
        interDepartmentIn: [],
        interDepartmentOut: [],
      },
    } as unknown as Partial<DailyRecord>)
    const rec2 = makeDailyRecord() // empty
    const result = buildPairDailyData(
      'A->B',
      [
        [1, rec1],
        [2, rec2],
      ],
      'interStoreIn',
      'interStoreOut',
    )
    expect(result).toHaveLength(1)
    expect(result![0].day).toBe(1)
    expect(result![0].cost).toBe(150)
    expect(result![0].price).toBe(180)
  })
})

// ─── calculateDailyTotals ─────────────────────────────────

describe('calculateDailyTotals', () => {
  it('returns zeros for empty days', () => {
    const t = calculateDailyTotals([], 'interStoreIn', 'interStoreOut')
    expect(t).toEqual({ inCost: 0, inPrice: 0, outCost: 0, outPrice: 0 })
  })

  it('sums in and out across days', () => {
    const rec1 = makeDailyRecord({
      interStoreIn: { cost: 100, price: 120 },
      interStoreOut: { cost: 50, price: 60 },
    } as unknown as Partial<DailyRecord>)
    const rec2 = makeDailyRecord({
      interStoreIn: { cost: 200, price: 220 },
      interStoreOut: { cost: 30, price: 40 },
    } as unknown as Partial<DailyRecord>)
    const t = calculateDailyTotals(
      [
        [1, rec1],
        [2, rec2],
      ],
      'interStoreIn',
      'interStoreOut',
    )
    expect(t).toEqual({ inCost: 300, inPrice: 340, outCost: 80, outPrice: 100 })
  })
})

// ─── buildItemDetailData ──────────────────────────────────

describe('buildItemDetailData', () => {
  it('returns null when selectedItem is null', () => {
    expect(buildItemDetailData(null, [], new Map())).toBeNull()
  })

  it('collects matching items across storeResults and sorts by day then storeId', () => {
    const stores = makeStoreMap([
      { id: 'S1', name: 'Store One' },
      { id: 'S2', name: 'Store Two' },
    ])
    const mkResult = (storeId: string, daily: [number, DailyRecord][]): StoreResult =>
      ({ storeId, daily: new Map(daily) }) as unknown as StoreResult

    const rec1 = makeDailyRecord({
      costInclusion: {
        cost: 0,
        items: [
          { itemCode: 'TARGET', itemName: 'T', accountCode: 'A', quantity: 5, cost: 100 },
          { itemCode: 'OTHER', itemName: 'O', accountCode: 'A', quantity: 1, cost: 20 },
        ],
      },
    } as unknown as Partial<DailyRecord>)
    const rec2 = makeDailyRecord({
      costInclusion: {
        cost: 0,
        items: [{ itemCode: 'TARGET', itemName: 'T', accountCode: 'A', quantity: 2, cost: 40 }],
      },
    } as unknown as Partial<DailyRecord>)

    const results = [mkResult('S2', [[1, rec1]]), mkResult('S1', [[1, rec2]])]
    const details = buildItemDetailData('TARGET', results, stores)
    expect(details).not.toBeNull()
    expect(details).toHaveLength(2)
    // Same day 1 → sort by storeId: S1 first, S2 second
    expect(details![0].storeId).toBe('S1')
    expect(details![0].storeName).toBe('Store One')
    expect(details![0].quantity).toBe(2)
    expect(details![1].storeId).toBe('S2')
    expect(details![1].storeName).toBe('Store Two')
    expect(details![1].cost).toBe(100)
  })

  it('falls back to storeId when store not found', () => {
    const mkResult = (storeId: string, daily: [number, DailyRecord][]): StoreResult =>
      ({ storeId, daily: new Map(daily) }) as unknown as StoreResult
    const rec = makeDailyRecord({
      costInclusion: {
        cost: 0,
        items: [{ itemCode: 'X', itemName: 'X', accountCode: 'A', quantity: 1, cost: 10 }],
      },
    } as unknown as Partial<DailyRecord>)
    const details = buildItemDetailData('X', [mkResult('UNKNOWN', [[1, rec]])], new Map())
    expect(details![0].storeName).toBe('UNKNOWN')
  })
})

// ─── buildDailyCostInclusionData ──────────────────────────

describe('buildDailyCostInclusionData', () => {
  it('returns empty for empty days', () => {
    expect(buildDailyCostInclusionData([])).toEqual([])
  })

  it('filters out days with no cost and no items', () => {
    const empty = makeDailyRecord()
    const result = buildDailyCostInclusionData([[1, empty]])
    expect(result).toEqual([])
  })

  it('includes days with cost > 0', () => {
    const rec = makeDailyRecord({
      costInclusion: { cost: 500, items: [] },
    } as unknown as Partial<DailyRecord>)
    const result = buildDailyCostInclusionData([[7, rec]])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ day: 7, cost: 500, itemCount: 0, items: [] })
  })

  it('includes days with items even when cost is 0', () => {
    const items = [{ itemCode: 'X', itemName: 'X', accountCode: 'A', quantity: 1, cost: 0 }]
    const rec = makeDailyRecord({
      costInclusion: { cost: 0, items },
    } as unknown as Partial<DailyRecord>)
    const result = buildDailyCostInclusionData([[3, rec]])
    expect(result).toHaveLength(1)
    expect(result[0].day).toBe(3)
    expect(result[0].itemCount).toBe(1)
    expect(result[0].items).toBe(items)
  })
})
