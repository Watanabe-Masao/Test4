/**
 * 分類別売上データモデル
 *
 * 旧「売上売変客数」ファイルに代わる新しいデータソース。
 * 各レコードが年月日を自己保持し、4階層カテゴリ（グループ > 部門 > ライン > クラス）
 * と4種の売変内訳を持つ。
 */

// ─── 売変種別定義（単一の真実の源） ────────────────────────

/** 売変種別コード */
export type DiscountType = '71' | '72' | '73' | '74'

/** 売変種別の定義エントリ */
export interface DiscountTypeDef {
  readonly type: DiscountType
  readonly label: string
  /** ClassifiedSalesRecord 上のフィールド名 */
  readonly field: 'discount71' | 'discount72' | 'discount73' | 'discount74'
}

/**
 * 売変種別マスタ — 種別追加時はここだけ変更する。
 *
 * ClassifiedSalesRecord のフィールド追加 + ここへのエントリ追加で
 * パイプライン全体（集約 → DailyRecord → StoreResult → チャート）に自動伝播する。
 */
export const DISCOUNT_TYPES: readonly DiscountTypeDef[] = [
  { type: '71', label: '政策売変', field: 'discount71' },
  { type: '72', label: 'レジ値引', field: 'discount72' },
  { type: '73', label: '廃棄売変', field: 'discount73' },
  { type: '74', label: '試食売変', field: 'discount74' },
] as const

// ─── 売変内訳（配列ベース） ─────────────────────────────────

/** 売変1種別のエントリ */
export interface DiscountEntry {
  readonly type: DiscountType
  readonly label: string
  readonly amount: number
}

/** ゼロ内訳（初期値用） */
export const ZERO_DISCOUNT_ENTRIES: readonly DiscountEntry[] = DISCOUNT_TYPES.map((d) => ({
  type: d.type,
  label: d.label,
  amount: 0,
}))

/**
 * ClassifiedSalesRecord から売変内訳配列を生成する。
 * Math.abs() による正規化はここで行う。
 */
export function extractDiscountEntries(rec: ClassifiedSalesRecord): readonly DiscountEntry[] {
  return DISCOUNT_TYPES.map((d) => {
    const raw = rec[d.field]
    return {
      type: d.type,
      label: d.label,
      amount: Math.abs(typeof raw === 'number' && !Number.isNaN(raw) ? raw : 0),
    }
  })
}

/**
 * 売変内訳配列の合計を算出する（唯一の合算ポイント）。
 * 全ての売変合計はこの関数を経由すること。
 */
export function sumDiscountEntries(entries: readonly DiscountEntry[]): number {
  let total = 0
  for (const e of entries) total += e.amount
  return total
}

/**
 * 2つの売変内訳配列を加算する。
 * 同じ type 同士を合算。
 */
export function addDiscountEntries(
  a: readonly DiscountEntry[],
  b: readonly DiscountEntry[],
): readonly DiscountEntry[] {
  return DISCOUNT_TYPES.map((d) => {
    const aEntry = a.find((e) => e.type === d.type)
    const bEntry = b.find((e) => e.type === d.type)
    return {
      type: d.type,
      label: d.label,
      amount: (aEntry?.amount ?? 0) + (bEntry?.amount ?? 0),
    }
  })
}

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
}

/**
 * 指定店舗の分類別売上を日別に集約する。
 * dailyBuilder が直接使用する。
 */
export function aggregateForStore(
  data: ClassifiedSalesData,
  storeId: string,
): Record<number, ClassifiedSalesDaySummary> {
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
    result[Number(day)] = {
      sales: val.sales,
      discount: sumDiscountEntries(val.entries),
      discountEntries: val.entries,
    }
  }
  return result
}

/**
 * 全店舗の分類別売上を storeId → day → summary に集約する。
 * 複数箇所で呼ばれるため全店舗版も提供。
 */
export function aggregateAllStores(
  data: ClassifiedSalesData,
): Record<string, Record<number, ClassifiedSalesDaySummary>> {
  const acc: Record<string, Record<number, { sales: number; entries: DiscountEntry[] }>> = {}
  for (const rec of data.records) {
    if (!acc[rec.storeId]) acc[rec.storeId] = {}
    if (!acc[rec.storeId][rec.day]) {
      acc[rec.storeId][rec.day] = { sales: 0, entries: ZERO_DISCOUNT_ENTRIES.map((e) => ({ ...e })) }
    }
    acc[rec.storeId][rec.day].sales += rec.salesAmount
    const recEntries = extractDiscountEntries(rec)
    acc[rec.storeId][rec.day].entries = addDiscountEntries(acc[rec.storeId][rec.day].entries, recEntries) as DiscountEntry[]
  }
  const result: Record<string, Record<number, ClassifiedSalesDaySummary>> = {}
  for (const [storeId, days] of Object.entries(acc)) {
    result[storeId] = {}
    for (const [day, val] of Object.entries(days)) {
      result[storeId][Number(day)] = {
        sales: val.sales,
        discount: sumDiscountEntries(val.entries),
        discountEntries: val.entries,
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
