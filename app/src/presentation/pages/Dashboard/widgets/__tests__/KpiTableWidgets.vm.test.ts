/**
 * KpiTableWidgets.vm.ts — pure view-model test
 *
 * 検証対象:
 * - sortStoreEntries: store code 昇順ソート + label/name 解決
 * - computePeriodInfo: effectiveEndDay / isPartialPeriod の分岐
 * - computeStoreRowData: gpRateVariance, periodBudget (partial vs full), salesVariance, periodAchRate
 * - computeStoreRowColorInputs / computeDeptKpiRowColorInputs: 正負フラグ
 * - computeWarnings: purchaseShort / missingDiscount
 * - buildCsvHeaders: isPartialPeriod で列名分岐
 * - buildCsvRow: 各セル変換
 * - buildCsvContent: BOM + CSV エスケープ
 * - buildCsvBlob / buildCsvFilename: Blob 生成とファイル名生成
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  sortStoreEntries,
  computePeriodInfo,
  computeStoreRowData,
  computeStoreRowColorInputs,
  computeDeptKpiRowColorInputs,
  computeWarnings,
  buildCsvHeaders,
  buildCsvRow,
  buildCsvContent,
  buildCsvBlob,
  buildCsvFilename,
} from '../KpiTableWidgets.vm'
import type { Store, DepartmentKpiRecord } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'

function makeStoreResult(overrides: Partial<StoreResult> = {}): StoreResult {
  return {
    storeId: 's1',
    totalSales: 1_000_000,
    budget: 1_200_000,
    grossProfit: 300_000,
    grossProfitRate: 0.3,
    grossProfitRateBudget: 0.32,
    grossProfitBudget: 384_000,
    projectedSales: 1_100_000,
    budgetDaily: new Map<number, number>([
      [1, 30_000],
      [2, 40_000],
      [3, 50_000],
    ]),
    coreMarkupRate: 0.35,
    discountRate: 0.05,
    openingInventory: 500_000,
    closingInventory: 400_000,
    estMethodMarginRate: 0.29,
    elapsedDays: 10,
    purchaseMaxDay: 10,
    hasDiscountData: true,
    ...overrides,
  } as unknown as StoreResult
}

function makeStore(id: string, code: string, name: string): Store {
  return { id, code, name } as unknown as Store
}

// ─── sortStoreEntries ──────────────────────────────

describe('sortStoreEntries', () => {
  it('store code 昇順ソート', () => {
    const results = new Map([
      ['s1', makeStoreResult({ storeId: 's1' })],
      ['s2', makeStoreResult({ storeId: 's2' })],
      ['s3', makeStoreResult({ storeId: 's3' })],
    ])
    const stores = new Map([
      ['s1', makeStore('s1', '003', 'Third')],
      ['s2', makeStore('s2', '001', 'First')],
      ['s3', makeStore('s3', '002', 'Second')],
    ])
    const result = sortStoreEntries(results, stores)
    expect(result.map((r) => r.label)).toEqual(['001', '002', '003'])
  })

  it('store 名を解決する / 未登録は storeId を使う', () => {
    const results = new Map([['unknown', makeStoreResult({ storeId: 'unknown' })]])
    const stores = new Map<string, Store>()
    const result = sortStoreEntries(results, stores)
    expect(result[0].label).toBe('unknown')
    expect(result[0].name).toBe('unknown')
  })

  it('空入力 → 空配列', () => {
    expect(sortStoreEntries(new Map(), new Map())).toEqual([])
  })
})

// ─── computePeriodInfo ────────────────────────────

describe('computePeriodInfo', () => {
  it('elapsedDays が優先される', () => {
    const result = computePeriodInfo(15, 20, 30)
    expect(result.effectiveEndDay).toBe(15)
    expect(result.isPartialPeriod).toBe(true)
  })

  it('elapsedDays undefined: dataMaxDay (>0) を使う', () => {
    const result = computePeriodInfo(undefined, 20, 30)
    expect(result.effectiveEndDay).toBe(20)
    expect(result.isPartialPeriod).toBe(true)
  })

  it('両方不明: daysInMonth を使う', () => {
    const result = computePeriodInfo(undefined, 0, 30)
    expect(result.effectiveEndDay).toBe(30)
    expect(result.isPartialPeriod).toBe(false)
  })

  it('effectiveEndDay === daysInMonth → isPartialPeriod=false', () => {
    const result = computePeriodInfo(30, 30, 30)
    expect(result.isPartialPeriod).toBe(false)
  })
})

// ─── computeStoreRowData ──────────────────────────

describe('computeStoreRowData', () => {
  it('フル期間: periodBudget = budget', () => {
    const r = makeStoreResult()
    const result = computeStoreRowData(r, 30, false)
    expect(result.periodBudget).toBe(1_200_000)
  })

  it('部分期間: effectiveEndDay までの budgetDaily を合算', () => {
    const r = makeStoreResult()
    const result = computeStoreRowData(r, 2, true)
    // budgetDaily: 1→30000, 2→40000
    expect(result.periodBudget).toBe(70_000)
  })

  it('salesVariance = totalSales - periodBudget', () => {
    const r = makeStoreResult({ totalSales: 100_000 })
    const result = computeStoreRowData(r, 2, true)
    // periodBudget = 70000, salesVariance = 100000 - 70000 = 30000
    expect(result.salesVariance).toBe(30_000)
  })

  it('periodAchRate = totalSales / periodBudget', () => {
    const r = makeStoreResult({ totalSales: 70_000 })
    const result = computeStoreRowData(r, 2, true)
    // 70000 / 70000 = 1
    expect(result.periodAchRate).toBe(1)
  })

  it('budget=0 → periodGPBudget=0', () => {
    const r = makeStoreResult({ budget: 0, grossProfitBudget: 100_000 })
    const result = computeStoreRowData(r, 10, false)
    expect(result.periodGPBudget).toBe(0)
  })

  it('salesLanding = projectedSales - budget', () => {
    const r = makeStoreResult({ projectedSales: 1_500_000, budget: 1_200_000 })
    const result = computeStoreRowData(r, 30, false)
    expect(result.salesLanding).toBe(300_000)
  })
})

// ─── computeStoreRowColorInputs ───────────────────

describe('computeStoreRowColorInputs', () => {
  it('各 variance の正負フラグを返す', () => {
    const data = {
      gpRateBudget: 0.3,
      gpRateActual: 0.32,
      gpRateVariance: 0.02,
      periodBudget: 100,
      periodGPBudget: 30,
      salesVariance: -50,
      periodAchRate: 0.5,
      gpLanding: 0.3,
      salesLanding: 100,
    }
    const result = computeStoreRowColorInputs(data)
    expect(result.gpVarianceNonNegative).toBe(true)
    expect(result.salesVarianceNonNegative).toBe(false)
    expect(result.salesLandingNonNegative).toBe(true)
    expect(result.periodAchRate).toBe(0.5)
  })
})

// ─── computeDeptKpiRowColorInputs ─────────────────

describe('computeDeptKpiRowColorInputs', () => {
  it('正負フラグ', () => {
    const rec = {
      gpRateVariance: 0.01,
      salesVariance: 100,
      salesAchievement: 0.9,
    } as unknown as DepartmentKpiRecord
    const result = computeDeptKpiRowColorInputs(rec)
    expect(result.gpVarianceNonNegative).toBe(true)
    expect(result.salesVarianceNonNegative).toBe(true)
    expect(result.salesAchievement).toBe(0.9)
  })

  it('salesAchievement > 1: 100 で割る (percent→decimal)', () => {
    const rec = {
      gpRateVariance: 0,
      salesVariance: 0,
      salesAchievement: 95,
    } as unknown as DepartmentKpiRecord
    const result = computeDeptKpiRowColorInputs(rec)
    expect(result.salesAchievement).toBe(0.95)
  })

  it('salesAchievement <= -1 も 100 で割る', () => {
    const rec = {
      gpRateVariance: 0,
      salesVariance: 0,
      salesAchievement: -50,
    } as unknown as DepartmentKpiRecord
    const result = computeDeptKpiRowColorInputs(rec)
    expect(result.salesAchievement).toBe(-0.5)
  })
})

// ─── computeWarnings ──────────────────────────────

describe('computeWarnings', () => {
  it('purchaseMaxDay < elapsedDays → purchaseShort=true', () => {
    const agg = makeStoreResult({ purchaseMaxDay: 5, elapsedDays: 10 })
    expect(computeWarnings(agg).purchaseShort).toBe(true)
  })

  it('purchaseMaxDay=0 → purchaseShort=false (データなし)', () => {
    const agg = makeStoreResult({ purchaseMaxDay: 0, elapsedDays: 10 })
    expect(computeWarnings(agg).purchaseShort).toBe(false)
  })

  it('hasDiscountData=false && totalSales>0 → missingDiscount=true', () => {
    const agg = makeStoreResult({ hasDiscountData: false, totalSales: 100 })
    expect(computeWarnings(agg).missingDiscount).toBe(true)
  })

  it('totalSales=0 → missingDiscount=false', () => {
    const agg = makeStoreResult({ hasDiscountData: false, totalSales: 0 })
    expect(computeWarnings(agg).missingDiscount).toBe(false)
  })
})

// ─── buildCsvHeaders ──────────────────────────────

describe('buildCsvHeaders', () => {
  it("isPartialPeriod=true: '経過予算' を含む", () => {
    const result = buildCsvHeaders(true)
    expect(result).toContain('経過予算')
    expect(result).not.toContain('予算')
  })

  it("isPartialPeriod=false: '予算' を含む", () => {
    const result = buildCsvHeaders(false)
    expect(result).toContain('予算')
    expect(result).not.toContain('経過予算')
  })

  it('列数は 14', () => {
    expect(buildCsvHeaders(true)).toHaveLength(14)
    expect(buildCsvHeaders(false)).toHaveLength(14)
  })
})

// ─── buildCsvRow ──────────────────────────────────

describe('buildCsvRow', () => {
  it('店舗ラベルが先頭', () => {
    const r = makeStoreResult()
    const result = buildCsvRow(r, 'Store A', 30, false)
    expect(result[0]).toBe('Store A')
  })

  it('openingInventory=null → "-"', () => {
    const r = makeStoreResult({ openingInventory: null as unknown as number })
    const result = buildCsvRow(r, 'X', 30, false)
    expect(result[10]).toBe('-')
  })

  it('closingInventory=null → "-"', () => {
    const r = makeStoreResult({ closingInventory: null as unknown as number })
    const result = buildCsvRow(r, 'X', 30, false)
    expect(result[11]).toBe('-')
  })

  it('partialPeriod=true: budgetDaily を合算した値を出力', () => {
    const r = makeStoreResult()
    const result = buildCsvRow(r, 'X', 2, true)
    // periodBudget = 30000+40000 = 70000
    expect(result[6]).toContain('70,000')
  })
})

// ─── buildCsvContent ──────────────────────────────

describe('buildCsvContent', () => {
  it('BOM を先頭に含む', () => {
    const result = buildCsvContent(['a', 'b'], [])
    expect(result.charCodeAt(0)).toBe(0xfeff)
  })

  it('headers + rows を改行区切りで結合', () => {
    const result = buildCsvContent(['h1', 'h2'], [['a', 'b']])
    expect(result).toContain('"h1","h2"')
    expect(result).toContain('"a","b"')
  })

  it('ダブルクオートを "" でエスケープ', () => {
    const result = buildCsvContent(['h"1'], [])
    expect(result).toContain('"h""1"')
  })
})

// ─── buildCsvBlob ─────────────────────────────────

describe('buildCsvBlob', () => {
  it('text/csv type の Blob を返す', () => {
    const blob = buildCsvBlob('hello')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toContain('text/csv')
  })
})

// ─── buildCsvFilename ─────────────────────────────

describe('buildCsvFilename', () => {
  it('店舗別KPI一覧_{year}年{month}月.csv', () => {
    expect(buildCsvFilename(2026, 4)).toBe('店舗別KPI一覧_2026年4月.csv')
  })
})
