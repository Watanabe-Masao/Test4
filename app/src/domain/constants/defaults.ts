import type { AppSettings } from '../models'

/** デフォルトアプリケーション設定 */
export const DEFAULT_SETTINGS: Readonly<AppSettings> = {
  targetGrossProfitRate: 0.25,
  warningThreshold: 0.23,
  flowerCostRate: 0.8,
  directProduceCostRate: 0.85,
  defaultMarkupRate: 0.26,
  defaultBudget: 6_450_000,
} as const

/** 掛け率の範囲制限 */
export const COST_RATE_MIN = 0
export const COST_RATE_MAX = 1.2

/** 全店集計用の仮想店舗ID */
export const ALL_STORES_ID = 'all'
