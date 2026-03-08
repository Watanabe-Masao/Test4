/**
 * カテゴリエクスプローラー 共通型定義
 *
 * CategoryHierarchyExplorer と CategoryExplorerTable が使用する型。
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
}
