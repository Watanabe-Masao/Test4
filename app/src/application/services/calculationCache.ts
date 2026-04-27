/**
 * Phase 2.2: 計算結果のキャッシュ戦略
 *
 * MurmurHash3 を使用して入力データの堅牢なフィンガープリントを生成し、
 * StoreResult をキャッシュして不要な再計算を排除する。
 *
 * - 店舗単位のキャッシュ: 設定変更時は影響を受ける店舗のみ再計算
 * - LRU 的な制限: 最大エントリ数を超えると古いものから削除
 * - Worker 対応: computeFingerprint / computeGlobalFingerprint は
 *   Worker 内でも呼び出し可能（副作用なし）
 *
 * @responsibility R:unclassified
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { CalculationFrame } from '@/domain/models/CalculationFrame'
import type { AppSettings, StoreResult } from '@/domain/models/storeTypes'
import { hashData } from '@/domain/utilities/hash'

// ─── フィンガープリント生成 ──────────────────────────────

/**
 * 店舗別フィンガープリントを MurmurHash で生成する。
 */
export function computeFingerprint(
  storeId: string,
  data: MonthlyData,
  settings: AppSettings,
  frame: CalculationFrame,
  prevYear?: MonthlyData | null,
): string {
  const hashInput = {
    storeId,
    settings: {
      targetYear: settings.targetYear,
      targetMonth: settings.targetMonth,
      defaultMarkupRate: settings.defaultMarkupRate,
      defaultBudget: settings.defaultBudget,
      dataEndDay: settings.dataEndDay,
    },
    frame,
    purchase: data.purchase.records.filter((r) => r.storeId === storeId),
    classifiedSales: data.classifiedSales.records.filter((r) => r.storeId === storeId),
    prevYearClassifiedSales:
      prevYear?.classifiedSales.records.filter((r) => r.storeId === storeId) ?? [],
    interStoreIn: data.interStoreIn.records.filter((r) => r.storeId === storeId),
    interStoreOut: data.interStoreOut.records.filter((r) => r.storeId === storeId),
    flowers: data.flowers.records.filter((r) => r.storeId === storeId),
    directProduce: data.directProduce.records.filter((r) => r.storeId === storeId),
    consumables: data.consumables.records.filter((r) => r.storeId === storeId),
    invConfig: data.settings.get(storeId),
    budget: data.budget.get(storeId),
  }

  const hash = hashData(hashInput)
  return `fp:${storeId}:${hash.toString(36)}`
}

/**
 * 全店舗分のフィンガープリントを結合した全体キーを生成する。
 */
export function computeGlobalFingerprint(
  data: MonthlyData,
  settings: AppSettings,
  frame: CalculationFrame,
  prevYear?: MonthlyData | null,
): string {
  const storeIds = Array.from(data.stores.keys()).sort()

  const storeFps = storeIds.map((id) => computeFingerprint(id, data, settings, frame, prevYear))

  const globalInput = {
    storeFps,
    storeCount: storeIds.length,
    supplierCategoryCount: Object.keys(settings.supplierCategoryMap).length,
    targetYear: settings.targetYear,
    targetMonth: settings.targetMonth,
    defaultMarkupRate: settings.defaultMarkupRate,
    defaultBudget: settings.defaultBudget,
    frame,
    csRecordCount: data.classifiedSales?.records?.length ?? 0,
    pycsRecordCount: prevYear?.classifiedSales?.records?.length ?? 0,
    ctsRecordCount: data.categoryTimeSales?.records?.length ?? 0,
    pyctsRecordCount: prevYear?.categoryTimeSales?.records?.length ?? 0,
    dkpiRecordCount: data.departmentKpi?.records?.length ?? 0,
  }

  const hash = hashData(globalInput)
  return `gfp:${hash.toString(36)}`
}

// ─── dataVersion ベースの軽量キャッシュキー ─────────────────

/**
 * 計算結果に影響する設定フィールドだけをハッシュする。
 */
function buildSettingsFingerprint(settings: AppSettings): string {
  const hash = hashData({
    targetYear: settings.targetYear,
    targetMonth: settings.targetMonth,
    targetGrossProfitRate: settings.targetGrossProfitRate,
    warningThreshold: settings.warningThreshold,
    flowerCostRate: settings.flowerCostRate,
    directProduceCostRate: settings.directProduceCostRate,
    defaultMarkupRate: settings.defaultMarkupRate,
    defaultBudget: settings.defaultBudget,
    dataEndDay: settings.dataEndDay,
    supplierCategoryMap: settings.supplierCategoryMap,
    prevYearSourceYear: settings.prevYearSourceYear,
    prevYearSourceMonth: settings.prevYearSourceMonth,
    prevYearDowOffset: settings.prevYearDowOffset,
    alignmentPolicy: settings.alignmentPolicy,
    conditionConfig: settings.conditionConfig,
  })
  return hash.toString(36)
}

/**
 * dataVersion + settings hash + frame で O(1) のキャッシュキーを生成する。
 */
export function computeCacheKey(
  dataVersion: number,
  settings: AppSettings,
  frame: CalculationFrame,
): string {
  return `v${dataVersion}:s${buildSettingsFingerprint(settings)}:d${frame.daysInMonth}:e${frame.effectiveDays}`
}

// ─── キャッシュストア ────────────────────────────────────

interface CacheEntry {
  fingerprint: string
  result: StoreResult
  timestamp: number
}

interface GlobalCacheEntry {
  cacheKey: string
  result: ReadonlyMap<string, StoreResult>
  timestamp: number
}

const MAX_ENTRIES = 100
const MAX_GLOBAL_ENTRIES = 20

export class CalculationCache {
  private storeCache = new Map<string, CacheEntry>()
  private globalFingerprint: string | null = null
  private globalResult: ReadonlyMap<string, StoreResult> | null = null
  private globalCacheByKey = new Map<string, GlobalCacheEntry>()
  private currentCacheKey: string | null = null

  getStoreResult(
    storeId: string,
    data: MonthlyData,
    settings: AppSettings,
    frame: CalculationFrame,
    prevYear?: MonthlyData | null,
  ): StoreResult | null {
    const fp = computeFingerprint(storeId, data, settings, frame, prevYear)
    const entry = this.storeCache.get(storeId)
    if (entry && entry.fingerprint === fp) {
      return entry.result
    }
    return null
  }

  setStoreResult(
    storeId: string,
    data: MonthlyData,
    settings: AppSettings,
    frame: CalculationFrame,
    result: StoreResult,
    prevYear?: MonthlyData | null,
  ): void {
    const fp = computeFingerprint(storeId, data, settings, frame, prevYear)
    this.storeCache.set(storeId, {
      fingerprint: fp,
      result,
      timestamp: Date.now(),
    })

    if (this.storeCache.size > MAX_ENTRIES) {
      let oldest: string | null = null
      let oldestTime = Infinity
      for (const [id, entry] of this.storeCache) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp
          oldest = id
        }
      }
      if (oldest) this.storeCache.delete(oldest)
    }
  }

  getGlobalResult(
    data: MonthlyData,
    settings: AppSettings,
    frame: CalculationFrame,
    prevYear?: MonthlyData | null,
  ): ReadonlyMap<string, StoreResult> | null {
    const fp = computeGlobalFingerprint(data, settings, frame, prevYear)
    if (this.globalFingerprint === fp && this.globalResult) {
      return this.globalResult
    }
    return null
  }

  getGlobalResultByFingerprint(fingerprint: string): ReadonlyMap<string, StoreResult> | null {
    if (this.globalFingerprint === fingerprint && this.globalResult) {
      return this.globalResult
    }
    return null
  }

  setGlobalResult(
    data: MonthlyData,
    settings: AppSettings,
    frame: CalculationFrame,
    results: ReadonlyMap<string, StoreResult>,
    prevYear?: MonthlyData | null,
  ): void {
    this.globalFingerprint = computeGlobalFingerprint(data, settings, frame, prevYear)
    this.globalResult = results

    for (const [storeId, result] of results) {
      this.setStoreResult(storeId, data, settings, frame, result, prevYear)
    }
  }

  setGlobalResultWithFingerprint(
    fingerprint: string,
    results: ReadonlyMap<string, StoreResult>,
  ): void {
    this.globalFingerprint = fingerprint
    this.globalResult = results
  }

  // ─── cacheKey ベース（O(1) lookup） ────────

  getGlobalResultByCacheKey(cacheKey: string): ReadonlyMap<string, StoreResult> | null {
    return this.globalCacheByKey.get(cacheKey)?.result ?? null
  }

  setGlobalResultWithCacheKey(cacheKey: string, results: ReadonlyMap<string, StoreResult>): void {
    this.currentCacheKey = cacheKey
    this.globalCacheByKey.set(cacheKey, {
      cacheKey,
      result: results,
      timestamp: Date.now(),
    })

    if (this.globalCacheByKey.size > MAX_GLOBAL_ENTRIES) {
      let oldestKey: string | null = null
      let oldestTime = Infinity
      for (const [key, entry] of this.globalCacheByKey) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp
          oldestKey = key
        }
      }
      if (oldestKey) this.globalCacheByKey.delete(oldestKey)
    }
  }

  get currentGlobalCacheKey(): string | null {
    return this.currentCacheKey
  }

  clear(): void {
    this.storeCache.clear()
    this.globalFingerprint = null
    this.globalResult = null
    this.globalCacheByKey.clear()
    this.currentCacheKey = null
  }

  get size(): number {
    return this.storeCache.size
  }

  get hasGlobalCache(): boolean {
    return this.globalResult !== null
  }

  get currentGlobalFingerprint(): string | null {
    return this.globalFingerprint
  }
}

/** アプリケーション全体で共有するキャッシュインスタンス */
export const calculationCache = new CalculationCache()
