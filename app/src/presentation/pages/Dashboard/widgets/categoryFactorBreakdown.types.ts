/**
 * CategoryFactorBreakdown 共有型定義
 *
 * @responsibility R:unclassified
 */

export type DecompLevel = 2 | 3 | 5

export interface FactorItem {
  name: string
  code: string
  _level: DecompLevel
  // Level 2
  custEffect: number
  ticketEffect: number
  // Level 3
  qtyEffect: number
  priceEffect: number
  // Level 5
  pricePureEffect: number
  mixEffect: number
  // Common
  totalChange: number
  prevAmount: number
  curAmount: number
  hasChildren: boolean
}

/** Waterfall range [start, end] per effect for horizontal sub-waterfall */
export interface WaterfallFactorItem extends FactorItem {
  custRange: [number, number]
  ticketRange: [number, number]
  qtyRange: [number, number]
  priceRange: [number, number]
  pricePureRange: [number, number]
  mixRange: [number, number]
}

export type DrillLevel = 'dept' | 'line' | 'class'

export interface PathEntry {
  level: DrillLevel
  code: string
  name: string
}

export interface FactorTotals {
  prevAmount: number
  curAmount: number
  totalChange: number
  custEffect: number
  ticketEffect: number
  qtyEffect: number
  priceEffect: number
  pricePureEffect: number
  mixEffect: number
}
