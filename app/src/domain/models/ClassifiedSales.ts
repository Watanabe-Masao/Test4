/**
 * 分類別売上データモデル
 *
 * 旧「売上売変客数」ファイルに代わる新しいデータソース。
 * 各レコードが年月日を自己保持し、4階層カテゴリ（グループ > 部門 > ライン > クラス）
 * と4種の売変内訳を持つ。
 *
 * 売変種別の定義・操作は DiscountEntry.ts に分離。
 *
 * @responsibility R:unclassified
 */
import type { DiscountEntry } from './DiscountEntry'
import {
  ZERO_DISCOUNT_ENTRIES,
  extractDiscountEntries,
  addDiscountEntries,
  sumDiscountEntries,
} from './DiscountEntry'

// ─── 分類別売上レコード ─────────────────────────────────────

/** 分類別売上 1行レコード */
export interface ClassifiedSalesRecord {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly storeId: string
  readonly storeName: string
  readonly groupName: string
  readonly departmentName: string
  readonly lineName: string
  readonly className: string
  readonly salesAmount: number
  /** 71売変（政策売変） */
  readonly discount71: number
  /** 72売変（レジ値引） */
  readonly discount72: number
  /** 73売変（廃棄売変） */
  readonly discount73: number
  /** 74売変（試食売変） */
  readonly discount74: number
}

/** 分類別売上パース結果 */
export interface ClassifiedSalesData {
  readonly records: readonly ClassifiedSalesRecord[]
}

/** ClassifiedSalesRecord の一意キーを生成する（差分比較用） */
export function classifiedSalesRecordKey(rec: ClassifiedSalesRecord): string {
  return `${rec.year}\t${rec.month}\t${rec.day}\t${rec.storeId}\t${rec.groupName}\t${rec.departmentName}\t${rec.lineName}\t${rec.className}`
}

// ─── 店舗×日の集約 ──────────────────────────────────────────

/** 店舗×日の集約サマリー */
export interface ClassifiedSalesDaySummary {
  readonly sales: number
  /** 売変合計（= sumDiscountEntries(discountEntries)） */
  readonly discount: number
  /** 売変種別内訳 */
  readonly discountEntries: readonly DiscountEntry[]
  /** 来店客数（flowers JOIN 由来。データなし時は 0） */
  readonly customers: number
}

/** flowers レコードを storeId × day でインデックス化（客数 JOIN 用）
 *
 * 花データは storeId × day で 1 レコードが正規形。
 * 重複レコードが存在する場合は last-write-wins で上書きする（二重計上防止）。
 */
function buildFlowersCustomerIndex(flowers?: {
  readonly records: readonly {
    readonly storeId: string
    readonly day: number
    readonly customers?: number
  }[]
}): Record<string, Record<number, number>> {
  if (!flowers || flowers.records.length === 0) return {}
  const idx: Record<string, Record<number, number>> = {}
  for (const r of flowers.records) {
    if (!idx[r.storeId]) idx[r.storeId] = {}
    idx[r.storeId][r.day] = r.customers ?? 0
  }
  return idx
}

/**
 * 指定店舗の分類別売上を日別に集約する。
 * dailyBuilder が直接使用する。
 *
 * @param flowers 花データ（客数 JOIN 用。省略時は customers=0）
 */
export function aggregateForStore(
  data: ClassifiedSalesData,
  storeId: string,
  flowers?: {
    readonly records: readonly {
      readonly storeId: string
      readonly day: number
      readonly customers?: number
    }[]
  },
): Record<number, ClassifiedSalesDaySummary> {
  const custIdx = buildFlowersCustomerIndex(flowers)
  const acc: Record<number, { sales: number; entries: DiscountEntry[] }> = {}
  for (const rec of data.records) {
    if (rec.storeId !== storeId) continue
    if (!acc[rec.day]) {
      acc[rec.day] = { sales: 0, entries: ZERO_DISCOUNT_ENTRIES.map((e) => ({ ...e })) }
    }
    acc[rec.day].sales += rec.salesAmount
    const recEntries = extractDiscountEntries(rec)
    acc[rec.day].entries = addDiscountEntries(acc[rec.day].entries, recEntries) as DiscountEntry[]
  }
  const result: Record<number, ClassifiedSalesDaySummary> = {}
  for (const [day, val] of Object.entries(acc)) {
    const d = Number(day)
    result[d] = {
      sales: val.sales,
      discount: sumDiscountEntries(val.entries),
      discountEntries: val.entries,
      customers: custIdx[storeId]?.[d] ?? 0,
    }
  }
  return result
}

/**
 * 全店舗の分類別売上を storeId → day → summary に集約する。
 * 複数箇所で呼ばれるため全店舗版も提供。
 *
 * @param flowers 花データ（客数 JOIN 用。省略時は customers=0）
 */
export function aggregateAllStores(
  data: ClassifiedSalesData,
  flowers?: {
    readonly records: readonly {
      readonly storeId: string
      readonly day: number
      readonly customers?: number
    }[]
  },
): Record<string, Record<number, ClassifiedSalesDaySummary>> {
  const custIdx = buildFlowersCustomerIndex(flowers)
  const acc: Record<string, Record<number, { sales: number; entries: DiscountEntry[] }>> = {}
  for (const rec of data.records) {
    if (!acc[rec.storeId]) acc[rec.storeId] = {}
    if (!acc[rec.storeId][rec.day]) {
      acc[rec.storeId][rec.day] = {
        sales: 0,
        entries: ZERO_DISCOUNT_ENTRIES.map((e) => ({ ...e })),
      }
    }
    acc[rec.storeId][rec.day].sales += rec.salesAmount
    const recEntries = extractDiscountEntries(rec)
    acc[rec.storeId][rec.day].entries = addDiscountEntries(
      acc[rec.storeId][rec.day].entries,
      recEntries,
    ) as DiscountEntry[]
  }
  const result: Record<string, Record<number, ClassifiedSalesDaySummary>> = {}
  for (const [storeId, days] of Object.entries(acc)) {
    result[storeId] = {}
    for (const [day, val] of Object.entries(days)) {
      const d = Number(day)
      result[storeId][d] = {
        sales: val.sales,
        discount: sumDiscountEntries(val.entries),
        discountEntries: val.entries,
        customers: custIdx[storeId]?.[d] ?? 0,
      }
    }
  }
  return result
}

/**
 * 分類別売上データの最大日を取得する。
 */
export function classifiedSalesMaxDay(data: ClassifiedSalesData): number {
  let max = 0
  for (const rec of data.records) {
    if (rec.day > max) max = rec.day
  }
  return max
}

/**
 * 2つの ClassifiedSalesData をマージする。
 * 同一キーのレコードは後者（incoming）で上書き。
 */
export function mergeClassifiedSalesData(
  existing: ClassifiedSalesData,
  incoming: ClassifiedSalesData,
): ClassifiedSalesData {
  const map = new Map<string, ClassifiedSalesRecord>()
  for (const rec of existing.records) {
    map.set(classifiedSalesRecordKey(rec), rec)
  }
  for (const rec of incoming.records) {
    map.set(classifiedSalesRecordKey(rec), rec)
  }
  return { records: Array.from(map.values()) }
}
