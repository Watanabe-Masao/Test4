/**
 * 分類別売上データモデル
 *
 * 旧「売上売変客数」ファイルに代わる新しいデータソース。
 * 各レコードが年月日を自己保持し、4階層カテゴリ（グループ > 部門 > ライン > クラス）
 * と4種の売変内訳を持つ。
 */

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
  return `${rec.day}\t${rec.storeId}\t${rec.groupName}\t${rec.departmentName}\t${rec.lineName}\t${rec.className}`
}

/** 店舗×日の集約サマリー */
export interface ClassifiedSalesDaySummary {
  readonly sales: number
  readonly discount: number
}

/**
 * 指定店舗の分類別売上を日別に集約する。
 * dailyBuilder が直接使用する。
 */
export function aggregateForStore(
  data: ClassifiedSalesData,
  storeId: string,
): Record<number, ClassifiedSalesDaySummary> {
  const result: Record<number, { sales: number; discount: number }> = {}
  for (const rec of data.records) {
    if (rec.storeId !== storeId) continue
    if (!result[rec.day]) result[rec.day] = { sales: 0, discount: 0 }
    result[rec.day].sales += rec.salesAmount
    result[rec.day].discount +=
      Math.abs(rec.discount71) +
      Math.abs(rec.discount72) +
      Math.abs(rec.discount73) +
      Math.abs(rec.discount74)
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
  const result: Record<string, Record<number, { sales: number; discount: number }>> = {}
  for (const rec of data.records) {
    if (!result[rec.storeId]) result[rec.storeId] = {}
    if (!result[rec.storeId][rec.day]) result[rec.storeId][rec.day] = { sales: 0, discount: 0 }
    result[rec.storeId][rec.day].sales += rec.salesAmount
    result[rec.storeId][rec.day].discount +=
      Math.abs(rec.discount71) +
      Math.abs(rec.discount72) +
      Math.abs(rec.discount73) +
      Math.abs(rec.discount74)
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
