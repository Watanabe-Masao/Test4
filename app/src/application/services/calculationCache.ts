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

  // ─── StoreDayRecord 系のキー数・値サマリー ─────────────
  const purchaseStore = data.purchase[storeId]
  const interStoreInStore = data.interStoreIn[storeId]
  const interStoreOutStore = data.interStoreOut[storeId]
  const flowersStore = data.flowers[storeId]
  const directProduceStore = data.directProduce[storeId]
  const consumablesStore = data.consumables[storeId]

  /** StoreDayRecord のキー数を返す */
  const dayCount = (store: Record<string, unknown> | undefined) =>
    store ? Object.keys(store).length : 0

  parts.push(`p:${dayCount(purchaseStore)}`)
  parts.push(`isi:${dayCount(interStoreInStore)}`)
  parts.push(`iso:${dayCount(interStoreOutStore)}`)
  parts.push(`fl:${dayCount(flowersStore)}`)
  parts.push(`dp:${dayCount(directProduceStore)}`)
  parts.push(`cs:${dayCount(consumablesStore)}`)

  // 分類別売上のレコード数と売上サマリー（店舗フィルタ）
  const csRecords = data.classifiedSales.records.filter((r) => r.storeId === storeId)
  parts.push(`csr:${csRecords.length}`)
  if (csRecords.length > 0) {
    let totalCS = 0
    for (const r of csRecords) totalCS += r.salesAmount
    parts.push(`cst:${totalCS}`)
  }

  // 前年分類別売上
  const prevCSRecords = data.prevYearClassifiedSales.records.filter((r) => r.storeId === storeId)
  parts.push(`pcsr:${prevCSRecords.length}`)
  if (prevCSRecords.length > 0) {
    let totalPCS = 0
    for (const r of prevCSRecords) totalPCS += r.salesAmount
    parts.push(`pcst:${totalPCS}`)
  }

  // 仕入データの値サマリー (最終日の合計額で変更を検出)
  if (purchaseStore) {
    const days = Object.keys(purchaseStore).map(Number).sort((a, b) => b - a)
    if (days.length > 0) {
      const lastDay = purchaseStore[days[0]]
      parts.push(`pl:${lastDay?.total?.cost ?? 0}:${lastDay?.total?.price ?? 0}`)
    }
  }

  // 店間移動の値サマリー (各日のレコード数で変更を検出)
  if (interStoreInStore) {
    let totalRecords = 0
    for (const dayData of Object.values(interStoreInStore)) {
      const entry = dayData as { interStoreIn: readonly unknown[]; interDepartmentIn: readonly unknown[] }
      totalRecords += (entry.interStoreIn?.length ?? 0) + (entry.interDepartmentIn?.length ?? 0)
    }
    parts.push(`isir:${totalRecords}`)
  }
  if (interStoreOutStore) {
    let totalRecords = 0
    for (const dayData of Object.values(interStoreOutStore)) {
      const entry = dayData as { interStoreOut: readonly unknown[]; interDepartmentOut: readonly unknown[] }
      totalRecords += (entry.interStoreOut?.length ?? 0) + (entry.interDepartmentOut?.length ?? 0)
    }
    parts.push(`isor:${totalRecords}`)
  }

  // 消耗品の値サマリー (合計コストで変更を検出)
  if (consumablesStore) {
    let totalConsumableCost = 0
    for (const dayData of Object.values(consumablesStore)) {
      totalConsumableCost += (dayData as { cost: number }).cost
    }
    parts.push(`cst:${totalConsumableCost}`)
  }

  // 花・産直の値サマリー
  if (flowersStore) {
    let totalFlowerCost = 0
    for (const dayData of Object.values(flowersStore)) {
      totalFlowerCost += (dayData as { cost: number }).cost
    }
    parts.push(`flt:${totalFlowerCost}`)
  }
  if (directProduceStore) {
    let totalDPCost = 0
    for (const dayData of Object.values(directProduceStore)) {
      totalDPCost += (dayData as { cost: number }).cost
    }
    parts.push(`dpt:${totalDPCost}`)
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
  parts.push(`cats:${Object.keys(settings.supplierCategoryMap).length}`)
  // 設定値をグローバルフィンガープリントに含める（店舗なしでも変更を検出）
  parts.push(`y:${settings.targetYear}`)
  parts.push(`m:${settings.targetMonth}`)
  parts.push(`mr:${settings.defaultMarkupRate}`)
  parts.push(`db:${settings.defaultBudget}`)
  parts.push(`dm:${daysInMonth}`)
  // 分類別売上・分類別時間帯売上・部門別KPI のレコード数
  parts.push(`cs:${data.classifiedSales?.records?.length ?? 0}`)
  parts.push(`pycs:${data.prevYearClassifiedSales?.records?.length ?? 0}`)
  parts.push(`cts:${data.categoryTimeSales?.records?.length ?? 0}`)
  parts.push(`pycts:${data.prevYearCategoryTimeSales?.records?.length ?? 0}`)
  parts.push(`dkpi:${data.departmentKpi?.records?.length ?? 0}`)
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
