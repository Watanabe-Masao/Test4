/**
 * Phase 2.2: 計算結果のキャッシュ戦略
 *
 * 入力データのフィンガープリント（軽量ハッシュ）をキーにして
 * StoreResult をキャッシュし、不要な再計算を排除する。
 *
 * - 店舗単位のキャッシュ: 設定変更時は影響を受ける店舗のみ再計算
 * - LRU 的な制限: 最大エントリ数を超えると古いものから削除
 */
import type { ImportedData, AppSettings, StoreResult } from '@/domain/models'

// ─── フィンガープリント生成 ──────────────────────────────

/**
 * 入力データと設定から軽量フィンガープリント文字列を生成する。
 * JSON.stringify は重いため、構造的なサマリーのみ使用。
 */
export function computeFingerprint(
  storeId: string,
  data: ImportedData,
  settings: AppSettings,
  daysInMonth: number,
): string {
  const parts: string[] = [
    storeId,
    String(settings.targetYear),
    String(settings.targetMonth),
    String(settings.defaultMarkupRate),
    String(settings.defaultBudget),
    String(settings.dataEndDay ?? 'null'),
    String(daysInMonth),
  ]

  // 店舗データの存在チェック (全フィールドのキー数をサマリーとして含む)
  const purchaseStore = data.purchase[storeId]
  const salesStore = data.sales[storeId]
  const discountStore = data.discount[storeId]

  parts.push(`p:${purchaseStore ? Object.keys(purchaseStore).length : 0}`)
  parts.push(`s:${salesStore ? Object.keys(salesStore).length : 0}`)
  parts.push(`d:${discountStore ? Object.keys(discountStore).length : 0}`)

  // 仕入データの値サマリー (最終日の合計額で変更を検出)
  if (purchaseStore) {
    const days = Object.keys(purchaseStore).map(Number).sort((a, b) => b - a)
    if (days.length > 0) {
      const lastDay = purchaseStore[days[0]]
      parts.push(`pl:${lastDay?.total?.cost ?? 0}:${lastDay?.total?.price ?? 0}`)
    }
  }

  // 売上データの値サマリー
  if (salesStore) {
    const days = Object.keys(salesStore).map(Number).sort((a, b) => b - a)
    if (days.length > 0) {
      const lastDay = salesStore[days[0]]
      parts.push(`sl:${lastDay?.sales ?? 0}`)
    }
  }

  // 在庫設定
  const invConfig = data.settings.get(storeId)
  if (invConfig) {
    parts.push(`inv:${invConfig.openingInventory ?? 'n'}:${invConfig.closingInventory ?? 'n'}`)
  }

  // 予算
  const budget = data.budget.get(storeId)
  if (budget) {
    parts.push(`bud:${budget.total}`)
  }

  return parts.join('|')
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
  const parts = storeIds.map((id) => computeFingerprint(id, data, settings, daysInMonth))
  parts.push(`stores:${storeIds.length}`)
  parts.push(`cats:${settings.customCategories.length}`)
  // 設定値をグローバルフィンガープリントに含める（店舗なしでも変更を検出）
  parts.push(`y:${settings.targetYear}`)
  parts.push(`m:${settings.targetMonth}`)
  parts.push(`mr:${settings.defaultMarkupRate}`)
  parts.push(`db:${settings.defaultBudget}`)
  parts.push(`dm:${daysInMonth}`)
  return parts.join('||')
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
   * 全体のフィンガープリントが一致する場合にキャッシュ済み結果を返す。
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
}

/** アプリケーション全体で共有するキャッシュインスタンス */
export const calculationCache = new CalculationCache()
