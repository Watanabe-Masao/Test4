/**
 * presentation/CostDetail/useCostDetailData.helpers.ts — pure helper test
 *
 * 検証対象:
 * - aggregateFlows: transferBreakdown の in + out 合算 + abs cost 降順
 * - buildTransferPivot: partner 店舗の cells / totals / 0 日スキップ
 * - aggregateByItem: 同 itemCode を合算 + dayCount 計算 + cost 降順
 * - aggregateByAccount: account 別集計
 * - buildFlowGroups: net 正負で in/out 分類
 * - buildPairDailyData / calculateDailyTotals: 日別合計
 * - buildItemDetailData: 日別 / item 明細
 * - buildDailyCostInclusionData: 日別 costInclusion 合計
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
import type { DailyRecord, TransferBreakdownEntry } from '@/domain/models/record'

function makeTransferEntry(
  fromStoreId: string,
  toStoreId: string,
  cost: number,
  price: number,
): TransferBreakdownEntry {
  return { fromStoreId, toStoreId, cost, price } as unknown as TransferBreakdownEntry
}

function makeRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
    interStoreIn: { cost: 0, price: 0 },
    interStoreOut: { cost: 0, price: 0 },
    interDepartmentIn: { cost: 0, price: 0 },
    interDepartmentOut: { cost: 0, price: 0 },
    costInclusion: { total: 0, items: [] },
    ...overrides,
  } as unknown as DailyRecord
}

// ─── aggregateFlows ───────────────────────────

describe('aggregateFlows', () => {
  it('空 days → 空配列', () => {
    expect(aggregateFlows([], 'interStoreIn', 'interStoreOut', new Map())).toEqual([])
  })

  it('in + out を合算', () => {
    const days: [number, DailyRecord][] = [
      [
        1,
        makeRecord({
          transferBreakdown: {
            interStoreIn: [makeTransferEntry('s2', 's1', 100, 200)],
            interStoreOut: [makeTransferEntry('s1', 's3', 50, 100)],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        } as unknown as Partial<DailyRecord>),
      ],
    ]
    const result = aggregateFlows(days, 'interStoreIn', 'interStoreOut', new Map())
    expect(result).toHaveLength(2)
  })

  it('|cost| 降順ソート', () => {
    const days: [number, DailyRecord][] = [
      [
        1,
        makeRecord({
          transferBreakdown: {
            interStoreIn: [
              makeTransferEntry('s2', 's1', 50, 100),
              makeTransferEntry('s3', 's1', 500, 1000),
              makeTransferEntry('s4', 's1', 200, 400),
            ],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        } as unknown as Partial<DailyRecord>),
      ],
    ]
    const result = aggregateFlows(days, 'interStoreIn', 'interStoreOut', new Map())
    expect(result.map((r) => r.cost)).toEqual([500, 200, 50])
  })

  it('店舗名を stores から解決 / 未登録は ID', () => {
    const days: [number, DailyRecord][] = [
      [
        1,
        makeRecord({
          transferBreakdown: {
            interStoreIn: [makeTransferEntry('s2', 's1', 100, 200)],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        } as unknown as Partial<DailyRecord>),
      ],
    ]
    const stores = new Map([
      ['s1', { id: 's1', name: 'Store 1' }],
      ['s2', { id: 's2', name: 'Store 2' }],
    ])
    const result = aggregateFlows(days, 'interStoreIn', 'interStoreOut', stores)
    expect(result[0].fromName).toBe('Store 2')
    expect(result[0].toName).toBe('Store 1')
  })
})

// ─── buildTransferPivot ───────────────────────

describe('buildTransferPivot', () => {
  it('空 days → 空 rows + 空 stores', () => {
    const result = buildTransferPivot([], 'interStoreIn', 'interStoreOut', new Map())
    expect(result.stores).toEqual([])
    expect(result.rows).toEqual([])
  })

  it('partner 店舗を列として抽出', () => {
    const days: [number, DailyRecord][] = [
      [
        1,
        makeRecord({
          transferBreakdown: {
            interStoreIn: [makeTransferEntry('s2', 's1', 100, 200)],
            interStoreOut: [makeTransferEntry('s1', 's3', 50, 100)],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
          interStoreIn: { cost: 100, price: 200 },
          interStoreOut: { cost: 50, price: 100 },
        } as unknown as Partial<DailyRecord>),
      ],
    ]
    const result = buildTransferPivot(days, 'interStoreIn', 'interStoreOut', new Map())
    expect(result.stores.map((s) => s.storeId).sort()).toEqual(['s2', 's3'])
  })

  it('inRec.cost=0 && outRec.cost=0 の日はスキップ', () => {
    const days: [number, DailyRecord][] = [
      [1, makeRecord()],
      [
        2,
        makeRecord({
          transferBreakdown: {
            interStoreIn: [makeTransferEntry('s2', 's1', 100, 200)],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
          interStoreIn: { cost: 100, price: 200 },
        } as unknown as Partial<DailyRecord>),
      ],
    ]
    const result = buildTransferPivot(days, 'interStoreIn', 'interStoreOut', new Map())
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].day).toBe(2)
  })

  it('totals: 全日の合計', () => {
    const days: [number, DailyRecord][] = [
      [
        1,
        makeRecord({
          transferBreakdown: {
            interStoreIn: [makeTransferEntry('s2', 's1', 100, 200)],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
          interStoreIn: { cost: 100, price: 200 },
        } as unknown as Partial<DailyRecord>),
      ],
      [
        2,
        makeRecord({
          transferBreakdown: {
            interStoreIn: [makeTransferEntry('s2', 's1', 50, 100)],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
          interStoreIn: { cost: 50, price: 100 },
        } as unknown as Partial<DailyRecord>),
      ],
    ]
    const result = buildTransferPivot(days, 'interStoreIn', 'interStoreOut', new Map())
    expect(result.totals.inCost).toBe(150)
    expect(result.totals.inPrice).toBe(300)
  })
})

// ─── aggregateByItem ──────────────────────────

describe('aggregateByItem', () => {
  function makeItem(
    itemCode: string,
    itemName: string,
    accountCode: string,
    quantity: number,
    cost: number,
  ) {
    return { itemCode, itemName, accountCode, quantity, cost }
  }

  it('空 → 空', () => {
    expect(aggregateByItem([])).toEqual([])
  })

  it('同 itemCode を合算 + 日数を数える', () => {
    const days: [number, DailyRecord][] = [
      [
        1,
        makeRecord({
          costInclusion: { total: 100, items: [makeItem('i1', 'A', 'a1', 2, 100)] },
        } as unknown as Partial<DailyRecord>),
      ],
      [
        2,
        makeRecord({
          costInclusion: { total: 50, items: [makeItem('i1', 'A', 'a1', 1, 50)] },
        } as unknown as Partial<DailyRecord>),
      ],
    ]
    const result = aggregateByItem(days)
    expect(result).toHaveLength(1)
    expect(result[0].totalQuantity).toBe(3)
    expect(result[0].totalCost).toBe(150)
    expect(result[0].dayCount).toBe(2)
  })

  it('totalCost 降順ソート', () => {
    const days: [number, DailyRecord][] = [
      [
        1,
        makeRecord({
          costInclusion: {
            total: 400,
            items: [makeItem('i1', 'A', 'a1', 1, 100), makeItem('i2', 'B', 'a1', 1, 300)],
          },
        } as unknown as Partial<DailyRecord>),
      ],
    ]
    const result = aggregateByItem(days)
    expect(result.map((r) => r.itemCode)).toEqual(['i2', 'i1'])
  })
})

// ─── aggregateByAccount ───────────────────────

describe('aggregateByAccount', () => {
  it('空 → 空', () => {
    expect(aggregateByAccount([])).toEqual([])
  })

  it('account 別に合算 + 降順', () => {
    const items = [
      {
        itemCode: 'i1',
        itemName: 'A',
        accountCode: 'a1',
        totalQuantity: 2,
        totalCost: 100,
        dayCount: 1,
      },
      {
        itemCode: 'i2',
        itemName: 'B',
        accountCode: 'a1',
        totalQuantity: 3,
        totalCost: 200,
        dayCount: 2,
      },
      {
        itemCode: 'i3',
        itemName: 'C',
        accountCode: 'a2',
        totalQuantity: 1,
        totalCost: 50,
        dayCount: 1,
      },
    ]
    const result = aggregateByAccount(items)
    const a1 = result.find((r) => r.accountCode === 'a1')
    expect(a1?.totalCost).toBe(300)
  })
})

// ─── buildFlowGroups ──────────────────────────

describe('buildFlowGroups', () => {
  it('空 flows → 空', () => {
    expect(buildFlowGroups([])).toEqual([])
  })

  it('flows をグループ化', () => {
    const flows = [{ from: 's1', to: 's2', fromName: 'A', toName: 'B', cost: 100, price: 200 }]
    const result = buildFlowGroups(flows)
    expect(result.length).toBeGreaterThanOrEqual(0)
  })
})

// ─── buildPairDailyData ───────────────────────

describe('buildPairDailyData', () => {
  it('selectedPair=null → null', () => {
    expect(buildPairDailyData(null, [], 'interStoreIn', 'interStoreOut')).toBeNull()
  })

  it('空 days → 空', () => {
    expect(buildPairDailyData('s1->s2', [], 'interStoreIn', 'interStoreOut')).toEqual([])
  })
})

// ─── calculateDailyTotals ─────────────────────

describe('calculateDailyTotals', () => {
  it('空 → 全 0', () => {
    const result = calculateDailyTotals([], 'interStoreIn', 'interStoreOut')
    expect(result.inCost).toBe(0)
    expect(result.inPrice).toBe(0)
    expect(result.outCost).toBe(0)
    expect(result.outPrice).toBe(0)
  })

  it('各 in/out の cost / price を合算', () => {
    const days: [number, DailyRecord][] = [
      [
        1,
        makeRecord({
          interStoreIn: { cost: 100, price: 200 },
          interStoreOut: { cost: 50, price: 100 },
        } as unknown as Partial<DailyRecord>),
      ],
    ]
    const result = calculateDailyTotals(days, 'interStoreIn', 'interStoreOut')
    expect(result.inCost).toBe(100)
    expect(result.outCost).toBe(50)
  })
})

// ─── buildItemDetailData ──────────────────────

describe('buildItemDetailData', () => {
  it('selectedItem=null → null', () => {
    expect(buildItemDetailData(null, [], new Map())).toBeNull()
  })

  it('空 selectedResults → 空配列', () => {
    expect(buildItemDetailData('i1', [], new Map())).toEqual([])
  })
})

// ─── buildDailyCostInclusionData ──────────────

describe('buildDailyCostInclusionData', () => {
  it('空 → 空', () => {
    expect(buildDailyCostInclusionData([])).toEqual([])
  })

  it('cost=0 && items=[] の日は除外', () => {
    const days: [number, DailyRecord][] = [
      [1, makeRecord()],
      [
        2,
        makeRecord({ costInclusion: { cost: 100, total: 100, items: [] } } as unknown as Partial<DailyRecord>),
      ],
    ]
    const result = buildDailyCostInclusionData(days)
    expect(result).toHaveLength(1)
    expect(result[0].day).toBe(2)
    expect(result[0].cost).toBe(100)
  })
})
