/**
 * Phase 2.2: CalculationCache テスト
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  CalculationCache,
  computeFingerprint,
  computeGlobalFingerprint,
} from '../calculationCache'
import { createEmptyImportedData } from '@/domain/models'
import type { AppSettings, StoreResult } from '@/domain/models'

const mockSettings: AppSettings = {
  targetYear: 2024,
  targetMonth: 1,
  targetGrossProfitRate: 0.25,
  warningThreshold: 0.23,
  flowerCostRate: 0.80,
  directProduceCostRate: 0.85,
  defaultMarkupRate: 0.3,
  defaultBudget: 1000000,
  dataEndDay: null,
  supplierCategoryMap: {},
  prevYearSourceYear: null,
  prevYearSourceMonth: null,
  prevYearDowOffset: null,
}

function makeStoreResult(storeId: string): StoreResult {
  return { storeId } as unknown as StoreResult
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
