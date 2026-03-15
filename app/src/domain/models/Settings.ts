// CustomCategory は customCategories.ts に移行。互換性のため re-export
import type { AlignmentPolicy } from './ComparisonFrame'
import type { ConditionSummaryConfig } from './ConditionConfig'
import type { CustomCategoryId } from '../constants/customCategories'
export type { CustomCategoryId as CustomCategory } from '../constants/customCategories'
import { PRESET_CATEGORY_DEFS, UNCATEGORIZED_CATEGORY_ID } from '../constants/customCategories'

/** 取引先に割り当て可能なカテゴリ一覧（未分類は自動割当のため除外） */
export const CUSTOM_CATEGORIES = PRESET_CATEGORY_DEFS.filter(
  (d) => d.id !== UNCATEGORIZED_CATEGORY_ID,
)

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
  readonly dataEndDay: number | null // 取込データ有効末日 (null = 月末まで)
  // コンディションサマリー — 粗利率色分け閾値 (ポイント単位: 0.20 = 0.20pt)
  readonly gpDiffBlueThreshold: number // 予算比+Npt以上で青 (default: 0.20)
  readonly gpDiffYellowThreshold: number // 予算比-Npt以上で黄色 (default: -0.20)
  readonly gpDiffRedThreshold: number // 予算比-Npt以上で赤 (default: -0.50)
  // コンディションサマリー — 売変率色分け閾値 (率: 0.02 = 2%)
  readonly discountBlueThreshold: number // N%以下で青 (default: 0.02)
  readonly discountYellowThreshold: number // N%以下で黄色 (default: 0.025)
  readonly discountRedThreshold: number // N%以下で赤 (default: 0.03)
  readonly supplierCategoryMap: Readonly<Partial<Record<string, CustomCategoryId>>> // 取引先→カテゴリ
  readonly userCategoryLabels: Readonly<Record<string, string>> // ユーザー作成カテゴリ (user:xxx → 表示名)
  // 前年比マッピング手動オーバーライド (null = 自動)
  readonly prevYearSourceYear: number | null // 前年データ取得元の年 (null = targetYear - 1)
  readonly prevYearSourceMonth: number | null // 前年データ取得元の月 (null = targetMonth)
  readonly prevYearDowOffset: number | null // 曜日オフセット手動指定 (null = 自動計算)
  readonly alignmentPolicy: AlignmentPolicy // 比較期間の合わせ方 (default: 'sameDayOfWeek')
  readonly conditionConfig: ConditionSummaryConfig // コンディションサマリー閾値設定
}

/** ビュー種別 */
export type ViewType =
  | 'dashboard'
  | 'store-analysis'
  | 'daily'
  | 'insight'
  | 'category'
  | 'cost-detail'
  | 'purchase-analysis'
  | 'reports'
  | 'admin'

/** データ種別 */
export type DataType =
  | 'purchase'
  | 'classifiedSales'
  | 'initialSettings'
  | 'budget'
  | 'consumables'
  | 'interStoreIn'
  | 'interStoreOut'
  | 'flowers'
  | 'directProduce'
  | 'categoryTimeSales'
  | 'departmentKpi'

/** IndexedDB ストレージで使用されるデータ種別キー */
export type StorageDataType =
  | 'purchase'
  | 'interStoreIn'
  | 'interStoreOut'
  | 'flowers'
  | 'directProduce'
  | 'consumables'
  | 'classifiedSales'
  | 'categoryTimeSales'
  | 'departmentKpi'
  | 'stores'
  | 'suppliers'
  | 'settings'
  | 'budget'
  | 'summaryCache'
  | 'importHistory'
