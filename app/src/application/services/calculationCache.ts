/**
 * Phase 2.2: 計算結果のキャッシュ戦略
 *
 * MurmurHash3 を使用して入力データの堅牢なフィンガープリントを生成し、
 * StoreResult をキャッシュして不要な再計算を排除する。
 *
 * 従来の軽量サマリー（dayCount + 一部値）を MurmurHash に置き換え、
 * 完全一致保証に近い検出精度を実現する。
 *
 * - 店舗単位のキャッシュ: 設定変更時は影響を受ける店舗のみ再計算
 * - LRU 的な制限: 最大エントリ数を超えると古いものから削除
 * - Worker 対応: computeFingerprint / computeGlobalFingerprint は
 *   Worker 内でも呼び出し可能（副作用なし）
 */
import type { ImportedData, AppSettings, StoreResult } from '@/domain/models'
import { hashData } from '@/domain/utilities/hash'

// ─── フィンガープリント生成 ──────────────────────────────

/**
 * 店舗別フィンガープリントを MurmurHash で生成する。
 * 入力データ全体をハッシュするため、従来の軽量サマリーと異なり
 * 値の変更を確実に検出できる。
 */
export function computeFingerprint(
  storeId: string,
  data: ImportedData,
  settings: AppSettings,
  daysInMonth: number,
): string {
  // ハッシュ対象: 店舗固有データ + 設定
  const hashInput = {
    storeId,
    settings: {
      targetYear: settings.targetYear,
      targetMonth: settings.targetMonth,
      defaultMarkupRate: settings.defaultMarkupRate,
      defaultBudget: settings.defaultBudget,
      dataEndDay: settings.dataEndDay,
    },
    daysInMonth,
    purchase: data.purchase.records.filter((r) => r.storeId === storeId),
    classifiedSales: data.classifiedSales.records.filter((r) => r.storeId === storeId),
    prevYearClassifiedSales: data.prevYearClassifiedSales.records.filter(
      (r) => r.storeId === storeId,
    ),
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
  data: ImportedData,
  settings: AppSettings,
  daysInMonth: number,
): string {
  const storeIds = Array.from(data.stores.keys()).sort()

  // 各店舗のフィンガープリントを結合
  const storeFps = storeIds.map((id) => computeFingerprint(id, data, settings, daysInMonth))

  // グローバル設定とデータもハッシュ対象
  const globalInput = {
    storeFps,
    storeCount: storeIds.length,
    supplierCategoryCount: Object.keys(settings.supplierCategoryMap).length,
    targetYear: settings.targetYear,
    targetMonth: settings.targetMonth,
    defaultMarkupRate: settings.defaultMarkupRate,
    defaultBudget: settings.defaultBudget,
    daysInMonth,
    csRecordCount: data.classifiedSales?.records?.length ?? 0,
    pycsRecordCount: data.prevYearClassifiedSales?.records?.length ?? 0,
    ctsRecordCount: data.categoryTimeSales?.records?.length ?? 0,
    pyctsRecordCount: data.prevYearCategoryTimeSales?.records?.length ?? 0,
    dkpiRecordCount: data.departmentKpi?.records?.length ?? 0,
  }

  const hash = hashData(globalInput)
  return `gfp:${hash.toString(36)}`
}

// ─── キャッシュストア ────────────────────────────────────

interface CacheEntry {
  fingerprint: string
  result: StoreResult
  timestamp: number
}

const MAX_ENTRIES = 100

export class CalculationCache {
  private storeCache = new Map<string, CacheEntry>()
  private globalFingerprint: string | null = null
  private globalResult: ReadonlyMap<string, StoreResult> | null = null

  /**
   * キャッシュから店舗の計算結果を取得する。
   * フィンガープリントが一致しない場合は null を返す。
   */
  getStoreResult(
    storeId: string,
    data: ImportedData,
    settings: AppSettings,
    daysInMonth: number,
  ): StoreResult | null {
    const fp = computeFingerprint(storeId, data, settings, daysInMonth)
    const entry = this.storeCache.get(storeId)
    if (entry && entry.fingerprint === fp) {
      return entry.result
    }
    return null
  }

  /**
   * 店舗の計算結果をキャッシュする。
   */
  setStoreResult(
    storeId: string,
    data: ImportedData,
    settings: AppSettings,
    daysInMonth: number,
    result: StoreResult,
  ): void {
    const fp = computeFingerprint(storeId, data, settings, daysInMonth)
    this.storeCache.set(storeId, {
      fingerprint: fp,
      result,
      timestamp: Date.now(),
    })

    // LRU 制限
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

  /**
   * 全店舗の結果をまとめてキャッシュチェックする。
   * フィンガープリントが一致する場合にキャッシュ済み結果を返す。
   */
  getGlobalResult(
    data: ImportedData,
    settings: AppSettings,
    daysInMonth: number,
  ): ReadonlyMap<string, StoreResult> | null {
    const fp = computeGlobalFingerprint(data, settings, daysInMonth)
    if (this.globalFingerprint === fp && this.globalResult) {
      return this.globalResult
    }
    return null
  }

  /**
   * フィンガープリント文字列でキャッシュチェックする。
   * Worker から返されたフィンガープリントとの比較用。
   */
  getGlobalResultByFingerprint(fingerprint: string): ReadonlyMap<string, StoreResult> | null {
    if (this.globalFingerprint === fingerprint && this.globalResult) {
      return this.globalResult
    }
    return null
  }

  /**
   * 全店舗の結果をキャッシュする。
   */
  setGlobalResult(
    data: ImportedData,
    settings: AppSettings,
    daysInMonth: number,
    results: ReadonlyMap<string, StoreResult>,
  ): void {
    this.globalFingerprint = computeGlobalFingerprint(data, settings, daysInMonth)
    this.globalResult = results

    // 個別店舗キャッシュも更新
    for (const [storeId, result] of results) {
      this.setStoreResult(storeId, data, settings, daysInMonth, result)
    }
  }

  /**
   * フィンガープリント文字列付きで全店舗の結果をキャッシュする。
   * Worker から返されたフィンガープリントを直接使用。
   */
  setGlobalResultWithFingerprint(
    fingerprint: string,
    results: ReadonlyMap<string, StoreResult>,
  ): void {
    this.globalFingerprint = fingerprint
    this.globalResult = results
  }

  /** キャッシュをクリアする */
  clear(): void {
    this.storeCache.clear()
    this.globalFingerprint = null
    this.globalResult = null
  }

  /** キャッシュされている店舗数 */
  get size(): number {
    return this.storeCache.size
  }

  /** グローバルキャッシュが有効か */
  get hasGlobalCache(): boolean {
    return this.globalResult !== null
  }

  /** 現在のグローバルフィンガープリント */
  get currentGlobalFingerprint(): string | null {
    return this.globalFingerprint
  }
}

/** アプリケーション全体で共有するキャッシュインスタンス */
export const calculationCache = new CalculationCache()
