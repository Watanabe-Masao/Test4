/**
 * カテゴリエクスプローラー 共通型定義
 *
 * CategoryHierarchyExplorer と CategoryExplorerTable が使用する型。
 * @responsibility R:utility
 */

export type SortKey =
  | 'amount'
  | 'quantity'
  | 'pct'
  | 'peakHour'
  | 'coreTimeStart'
  | 'turnaroundHour'
  | 'name'
  | 'yoyRatio'
  | 'yoyDiff'
  | 'piValue'
export type SortDir = 'asc' | 'desc'

export interface HierarchyItem {
  code: string
  name: string
  amount: number
  quantity: number
  pct: number
  peakHour: number
  coreTimeStart: number
  coreTimeEnd: number
  turnaroundHour: number
  hourlyPattern: number[]
  childCount: number
  prevAmount?: number
  prevQuantity?: number
  yoyRatio?: number
  yoyDiff?: number
  yoyQuantityRatio?: number
  prevPeakHour?: number
  peakHourShift?: number
  hasAnomalyShift?: boolean
  piValue?: number
  /** 取扱日数（この期間でこのカテゴリに売上があった日数） */
  handledDayCount?: number
  /** 総日数（この期間の全日数） */
  totalDayCount?: number
}
