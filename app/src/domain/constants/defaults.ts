import type { AppSettings } from '../models'

/** デフォルトアプリケーション設定を生成する（呼び出し時の現在日時を使用） */
export function createDefaultSettings(): Readonly<AppSettings> {
  const now = new Date()
  return {
    targetYear: now.getFullYear(),
    targetMonth: now.getMonth() + 1,
    targetGrossProfitRate: 0.25,
    warningThreshold: 0.23,
    flowerCostRate: 0.8,
    directProduceCostRate: 0.85,
    defaultMarkupRate: 0.26,
    defaultBudget: 6_450_000,
    dataEndDay: null,
    supplierCategoryMap: {},
  }
}

/** @deprecated createDefaultSettings() を使用してください */
export const DEFAULT_SETTINGS: Readonly<AppSettings> = createDefaultSettings()

/** 対象年月から月の日数を算出 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** 掛け率の範囲制限 */
export const COST_RATE_MIN = 0
export const COST_RATE_MAX = 1.2

/** 全店集計用の仮想店舗ID */
export const ALL_STORES_ID = 'all'
