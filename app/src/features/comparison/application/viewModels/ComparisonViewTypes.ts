/**
 * 比較 ViewModel 共通型
 *
 * 比較結果の表示用 shape を統一する。
 * Panel / Chart / Table がバラけずに済む。
 *
 * @responsibility R:unclassified
 */

/**
 * 比較ポイント — 同曜日/同日比較の共通表示単位
 *
 * dailyMapping の実装詳細を隠蔽し、UI が必要とするフィールドのみを公開する。
 * sourceDate は監査可能性（L3 ドリル）のために保持。
 */
export interface ComparisonPoint {
  readonly currentDay: number
  readonly sourceDate: { readonly year: number; readonly month: number; readonly day: number }
  readonly sales: number
  readonly customers: number
  readonly ctsQuantity: number
}

/**
 * 日別 YoY 行 — 当年 vs 前年の日別比較
 *
 * 売上・客数・販売点数の当年/前年を並べた共通行型。
 * conditionPanelYoY / SalesAnalysis / DailyChart など複数 widget で利用可能。
 */
export interface DailyYoYRow {
  readonly day: number
  readonly currentSales: number
  readonly prevSales: number
  readonly currentCustomers: number
  readonly prevCustomers: number
}

/**
 * 店舗別 YoY 行 — 店舗単位の前年比較
 */
export interface StoreYoYRow {
  readonly storeId: string
  readonly storeName: string
  readonly currentSales: number
  readonly prevSales: number
  readonly currentCustomers: number
  readonly prevCustomers: number
}
