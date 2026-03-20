/**
 * Phase 2.2: CalculationCache テスト
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { CalculationCache, computeFingerprint, computeGlobalFingerprint } from '../calculationCache'
import { createEmptyImportedData } from '@/domain/models/storeTypes'
import type { AppSettings, StoreResult } from '@/domain/models/storeTypes'

const mockSettings: AppSettings = {
  targetYear: 2024,
  targetMonth: 1,
  targetGrossProfitRate: 0.25,
  warningThreshold: 0.23,
  flowerCostRate: 0.8,
  directProduceCostRate: 0.85,
  defaultMarkupRate: 0.3,
  defaultBudget: 1000000,
  dataEndDay: null,
  supplierCategoryMap: {},
  prevYearSourceYear: null,
  prevYearSourceMonth: null,
  prevYearDowOffset: null,
  alignmentPolicy: 'sameDayOfWeek' as const,
  conditionConfig: { global: {}, storeOverrides: {} },
  gpDiffBlueThreshold: 0.2,
  gpDiffYellowThreshold: -0.2,
  gpDiffRedThreshold: -0.5,
  discountBlueThreshold: 0.02,
  discountYellowThreshold: 0.025,
  discountRedThreshold: 0.03,
  userCategoryLabels: {},
  storeLocations: {},
}

function makeStoreResult(storeId: string): StoreResult {
  return { storeId } as unknown as StoreResult
}

function makeCSRecord(day: number, storeId: string, salesAmount: number, discount = 0) {
  return {
    year: 2024,
    month: 1,
    day,
    storeId,
    storeName: `Store ${storeId}`,
    groupName: 'G1',
    departmentName: 'D1',
    lineName: 'L1',
    className: 'C1',
    salesAmount,
    discount71: discount,
    discount72: 0,
    discount73: 0,
    discount74: 0,
  }
}

describe('computeFingerprint', () => {
  it('同じ入力に対して同じフィンガープリントを返す', () => {
    const data = createEmptyImportedData()
    const fp1 = computeFingerprint('s1', data, mockSettings, 31)
    const fp2 = computeFingerprint('s1', data, mockSettings, 31)
    expect(fp1).toBe(fp2)
  })

  it('異なる店舗IDで異なるフィンガープリントを返す', () => {
    const data = createEmptyImportedData()
    const fp1 = computeFingerprint('s1', data, mockSettings, 31)
    const fp2 = computeFingerprint('s2', data, mockSettings, 31)
    expect(fp1).not.toBe(fp2)
  })

  it('設定変更でフィンガープリントが変わる', () => {
    const data = createEmptyImportedData()
    const fp1 = computeFingerprint('s1', data, mockSettings, 31)
    const fp2 = computeFingerprint('s1', data, { ...mockSettings, defaultMarkupRate: 0.5 }, 31)
    expect(fp1).not.toBe(fp2)
  })

  it('月の日数変更でフィンガープリントが変わる', () => {
    const data = createEmptyImportedData()
    const fp1 = computeFingerprint('s1', data, mockSettings, 31)
    const fp2 = computeFingerprint('s1', data, mockSettings, 28)
    expect(fp1).not.toBe(fp2)
  })

  it('消耗品データ追加でフィンガープリントが変わる', () => {
    const data1 = createEmptyImportedData()
    const data2 = {
      ...data1,
      consumables: {
        records: [
          {
            year: 2024,
            month: 1,
            day: 1,
            storeId: 's1',
            cost: 500,
            items: [
              {
                accountCode: '81257',
                itemCode: 'A001',
                itemName: 'テスト品',
                quantity: 1,
                cost: 500,
              },
            ],
          },
        ],
      },
    }
    const fp1 = computeFingerprint('s1', data1, mockSettings, 31)
    const fp2 = computeFingerprint('s1', data2, mockSettings, 31)
    expect(fp1).not.toBe(fp2)
  })

  it('花・産直データ追加でフィンガープリントが変わる', () => {
    const data1 = createEmptyImportedData()
    const data2 = {
      ...data1,
      flowers: {
        records: [{ year: 2024, month: 1, day: 1, storeId: 's1', cost: 1000, price: 1200 }],
      },
    }
    const fp1 = computeFingerprint('s1', data1, mockSettings, 31)
    const fp2 = computeFingerprint('s1', data2, mockSettings, 31)
    expect(fp1).not.toBe(fp2)
  })

  it('店間入出データ追加でフィンガープリントが変わる', () => {
    const data1 = createEmptyImportedData()
    const data2 = {
      ...data1,
      interStoreIn: {
        records: [
          {
            year: 2024,
            month: 1,
            day: 1,
            storeId: 's1',
            interStoreIn: [
              {
                day: 1,
                cost: 100,
                price: 120,
                fromStoreId: 's2',
                toStoreId: 's1',
                isDepartmentTransfer: false,
              },
            ],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        ],
      },
    }
    const fp1 = computeFingerprint('s1', data1, mockSettings, 31)
    const fp2 = computeFingerprint('s1', data2, mockSettings, 31)
    expect(fp1).not.toBe(fp2)
  })

  it('分類別売上データ追加でフィンガープリントが変わる', () => {
    const data1 = createEmptyImportedData()
    const data2 = {
      ...data1,
      classifiedSales: {
        records: [makeCSRecord(1, 's1', 10000, 500)],
      },
    }
    const fp1 = computeFingerprint('s1', data1, mockSettings, 31)
    const fp2 = computeFingerprint('s1', data2, mockSettings, 31)
    expect(fp1).not.toBe(fp2)
  })

  it('前年分類別売上データ追加でフィンガープリントが変わる', () => {
    const data1 = createEmptyImportedData()
    const data2 = {
      ...data1,
      prevYearClassifiedSales: {
        records: [makeCSRecord(1, 's1', 50000)],
      },
    }
    const fp1 = computeFingerprint('s1', data1, mockSettings, 31)
    const fp2 = computeFingerprint('s1', data2, mockSettings, 31)
    expect(fp1).not.toBe(fp2)
  })
})

describe('computeGlobalFingerprint', () => {
  it('店舗なしデータで一貫したフィンガープリントを返す', () => {
    const data = createEmptyImportedData()
    const fp1 = computeGlobalFingerprint(data, mockSettings, 31)
    const fp2 = computeGlobalFingerprint(data, mockSettings, 31)
    expect(fp1).toBe(fp2)
  })
})

describe('CalculationCache', () => {
  let cache: CalculationCache

  beforeEach(() => {
    cache = new CalculationCache()
  })

  it('初期状態では空', () => {
    expect(cache.size).toBe(0)
    expect(cache.hasGlobalCache).toBe(false)
  })

  it('store result をキャッシュ & 取得できる', () => {
    const data = createEmptyImportedData()
    const result = makeStoreResult('s1')

    cache.setStoreResult('s1', data, mockSettings, 31, result)
    expect(cache.size).toBe(1)

    const cached = cache.getStoreResult('s1', data, mockSettings, 31)
    expect(cached).toBe(result)
  })

  it('設定変更後はキャッシュミスになる', () => {
    const data = createEmptyImportedData()
    const result = makeStoreResult('s1')

    cache.setStoreResult('s1', data, mockSettings, 31, result)

    const cached = cache.getStoreResult('s1', data, { ...mockSettings, defaultMarkupRate: 0.5 }, 31)
    expect(cached).toBeNull()
  })

  it('global result をキャッシュ & 取得できる', () => {
    const data = createEmptyImportedData()
    const results = new Map([['s1', makeStoreResult('s1')]])

    cache.setGlobalResult(data, mockSettings, 31, results)
    expect(cache.hasGlobalCache).toBe(true)

    const cached = cache.getGlobalResult(data, mockSettings, 31)
    expect(cached).toBe(results)
  })

  it('global result は設定変更でキャッシュミスになる', () => {
    const data = createEmptyImportedData()
    const results = new Map([['s1', makeStoreResult('s1')]])

    cache.setGlobalResult(data, mockSettings, 31, results)

    const cached = cache.getGlobalResult(data, { ...mockSettings, defaultBudget: 999 }, 31)
    expect(cached).toBeNull()
  })

  it('clear でキャッシュが空になる', () => {
    const data = createEmptyImportedData()
    cache.setStoreResult('s1', data, mockSettings, 31, makeStoreResult('s1'))
    cache.setGlobalResult(data, mockSettings, 31, new Map())

    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.hasGlobalCache).toBe(false)
  })

  it('setGlobalResultWithFingerprint でキャッシュし getGlobalResultByFingerprint で取得できる', () => {
    const results = new Map([['s1', makeStoreResult('s1')]])
    cache.setGlobalResultWithFingerprint('fp-123', results)
    expect(cache.hasGlobalCache).toBe(true)
    expect(cache.currentGlobalFingerprint).toBe('fp-123')

    const cached = cache.getGlobalResultByFingerprint('fp-123')
    expect(cached).toBe(results)
  })

  it('getGlobalResultByFingerprint はフィンガープリント不一致で null を返す', () => {
    const results = new Map([['s1', makeStoreResult('s1')]])
    cache.setGlobalResultWithFingerprint('fp-123', results)

    const cached = cache.getGlobalResultByFingerprint('fp-different')
    expect(cached).toBeNull()
  })

  it('currentGlobalFingerprint は初期状態で null', () => {
    expect(cache.currentGlobalFingerprint).toBeNull()
  })

  it('setGlobalResult が個別キャッシュも更新する', () => {
    const data = createEmptyImportedData()
    const results = new Map([
      ['s1', makeStoreResult('s1')],
      ['s2', makeStoreResult('s2')],
    ])

    cache.setGlobalResult(data, mockSettings, 31, results)
    expect(cache.size).toBe(2)
  })
})
