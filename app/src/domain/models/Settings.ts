/** カスタムカテゴリ */
export type CustomCategory = '市場仕入' | 'LFC' | 'サラダ' | '加工品' | '消耗品' | '直伝' | 'その他'

export const CUSTOM_CATEGORIES: readonly CustomCategory[] = [
  '市場仕入', 'LFC', 'サラダ', '加工品', '消耗品', '直伝', 'その他',
] as const

/** アプリケーション設定 */
export interface AppSettings {
  readonly targetYear: number // 対象年
  readonly targetMonth: number // 対象月 (1-12)
  readonly targetGrossProfitRate: number // 目標粗利率 (default: 0.25)
  readonly warningThreshold: number // 警告しきい値 (default: 0.23)
  readonly flowerCostRate: number // 花掛け率 (default: 0.80)
  readonly directProduceCostRate: number // 産直掛け率 (default: 0.85)
  readonly defaultMarkupRate: number // デフォルト値入率 (default: 0.26)
  readonly defaultBudget: number // デフォルト予算 (default: 6,450,000)
  readonly supplierCategoryMap: Readonly<Record<string, CustomCategory>> // 取引先→カテゴリ
}

/** ビュー種別 */
export type ViewType =
  | 'dashboard'
  | 'category'
  | 'forecast'
  | 'analysis'
  | 'daily'
  | 'transfer'
  | 'consumable'
  | 'summary'
  | 'reports'
  | 'admin'

/** データ種別 */
export type DataType =
  | 'purchase'
  | 'sales'
  | 'discount'
  | 'salesDiscount'
  | 'prevYearSalesDiscount'
  | 'initialSettings'
  | 'budget'
  | 'consumables'
  | 'interStoreIn'
  | 'interStoreOut'
  | 'flowers'
  | 'directProduce'
  | 'categoryTimeSales'
