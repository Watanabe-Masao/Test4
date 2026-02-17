import type { AppSettings } from '../models'

/** 現在の年月を取得 */
const now = new Date()

/** デフォルトアプリケーション設定 */
export const DEFAULT_SETTINGS: Readonly<AppSettings> = {
  targetYear: now.getFullYear(),
  targetMonth: now.getMonth() + 1,
  targetGrossProfitRate: 0.25,
  warningThreshold: 0.23,
  flowerCostRate: 0.8,
  directProduceCostRate: 0.85,
  defaultMarkupRate: 0.26,
  defaultBudget: 6_450_000,
  supplierCategoryMap: {},
} as const

/** 対象年月から月の日数を算出 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** 掛け率の範囲制限 */
export const COST_RATE_MIN = 0
export const COST_RATE_MAX = 1.2

/** 全店集計用の仮想店舗ID */
export const ALL_STORES_ID = 'all'
