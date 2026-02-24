/**
 * 分類別売上データモデル
 *
 * 旧「売上売変客数」ファイルに代わる主要データソース。
 * 店舗×日×カテゴリ（グループ>部門>ライン>クラスの4階層）で
 * 販売金額・71〜74売変内訳を保持する。
 *
 * 設計原則:
 * - 全レコードが year/month/day を自己保持（年月不明状態を排除）
 * - 売変は71〜74の4種別に細分化（合計は計算で導出）
 * - 販売数量は保持しない（集計で導出可能）
 * - 客数はここに含まない（花ファイルから別取得）
 */

/** 分類別売上の1行レコード */
export interface ClassifiedSalesRecord {
  /** 年 (e.g. 2026) */
  readonly year: number
  /** 月 (1-12) */
  readonly month: number
  /** 日 (1-31) */
  readonly day: number
  /** 店舗ID (正規化済み: "1", "6" 等) */
  readonly storeId: string
  /** 店舗名称 */
  readonly storeName: string
  /** グループ名称 (e.g. "青果") */
  readonly groupName: string
  /** 部門名称 (e.g. "果物") */
  readonly departmentName: string
  /** ライン名称 (e.g. "柑橘") */
  readonly lineName: string
  /** クラス名称 (e.g. "温州みかん") */
  readonly className: string
  /** 販売金額 */
  readonly salesAmount: number
  /** 71売変: 政策売変 */
  readonly discount71: number
  /** 72売変: レジ値引 */
  readonly discount72: number
  /** 73売変: 廃棄売変 */
  readonly discount73: number
  /** 74売変: 試食売変 */
  readonly discount74: number
}

/** 分類別売上パース結果 */
export interface ClassifiedSalesData {
  readonly records: readonly ClassifiedSalesRecord[]
}

/** 分類別売上レコードの一意キーを生成する */
export function classifiedSalesRecordKey(rec: ClassifiedSalesRecord): string {
  return `${rec.year}-${rec.month}-${rec.day}\t${rec.storeId}\t${rec.groupName}\t${rec.departmentName}\t${rec.lineName}\t${rec.className}`
}

/** 売変合計を算出する（71+72+73+74） */
export function totalDiscount(rec: ClassifiedSalesRecord): number {
  return rec.discount71 + rec.discount72 + rec.discount73 + rec.discount74
}

/**
 * 分類別売上データをマージする（複数ファイル対応）
 * 同一キー（年月日・店舗・カテゴリ階層）のレコードは後から来たデータで上書き
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
  return { records: [...map.values()] }
}

/**
 * 分類別売上から店舗×日別の売上集計を生成する
 *
 * 旧 SalesData / DiscountData の代替。
 * ImportedData.sales / ImportedData.discount を
 * 分類別売上から導出するための変換関数。
 */
export interface DailySalesSummary {
  readonly sales: number
  readonly discount71: number
  readonly discount72: number
  readonly discount73: number
  readonly discount74: number
  readonly discountTotal: number
}

/**
 * 分類別売上レコードを店舗×日で集計する
 * @param records 分類別売上レコード配列
 * @param year 対象年
 * @param month 対象月
 * @returns storeId → day → DailySalesSummary
 */
export function aggregateToStoreDaySummary(
  records: readonly ClassifiedSalesRecord[],
  year: number,
  month: number,
): Record<string, Record<number, DailySalesSummary>> {
  const result: Record<string, Record<number, {
    sales: number
    discount71: number
    discount72: number
    discount73: number
    discount74: number
    discountTotal: number
  }>> = {}

  for (const rec of records) {
    if (rec.year !== year || rec.month !== month) continue

    if (!result[rec.storeId]) result[rec.storeId] = {}
    if (!result[rec.storeId][rec.day]) {
      result[rec.storeId][rec.day] = {
        sales: 0,
        discount71: 0,
        discount72: 0,
        discount73: 0,
        discount74: 0,
        discountTotal: 0,
      }
    }

    const day = result[rec.storeId][rec.day]
    day.sales += rec.salesAmount
    day.discount71 += rec.discount71
    day.discount72 += rec.discount72
    day.discount73 += rec.discount73
    day.discount74 += rec.discount74
    day.discountTotal += rec.discount71 + rec.discount72 + rec.discount73 + rec.discount74
  }

  return result
}
