/**
 * YoYWaterfallChart の pure builder 関数群
 *
 * React hooks を使わない純粋関数。useMemo 集約用。
 */
import type { DateRange } from '@/domain/models/calendar'
import type { CategoryTimeSalesRecord, DailyRecord } from '@/domain/models/record'
import {
  calculatePrevCtsDateRange,
  aggregatePeriodCurSales,
  aggregatePeriodPrevSales,
  calculatePISummary,
} from './YoYWaterfallChart.logic'
import {
  calculateItemsPerCustomer,
  calculateAveragePricePerItem,
} from '@/domain/calculations/utils'
import { decomposePriceMix } from './categoryFactorUtils'
import { aggregateTotalQuantity } from './YoYWaterfallChart.vm'
import type { ComparisonMode } from './types'

// ── Date Ranges ──

export interface DateRangesInput {
  readonly overrideDateRange: DateRange | undefined
  readonly year: number
  readonly month: number
  readonly dayStart: number
  readonly dayEnd: number
  readonly activeCompMode: ComparisonMode
  readonly canWoW: boolean
  readonly dowOffset: number
  readonly wowPrevStart: number
  readonly wowPrevEnd: number
}

export interface DateRangesResult {
  readonly curDateRange: DateRange
  readonly prevCtsDateRange: DateRange | undefined
}

export function buildDateRanges(input: DateRangesInput): DateRangesResult {
  const curDateRange: DateRange = input.overrideDateRange ?? {
    from: { year: input.year, month: input.month, day: input.dayStart },
    to: { year: input.year, month: input.month, day: input.dayEnd },
  }
  const prevCtsDateRange = calculatePrevCtsDateRange(
    input.activeCompMode,
    input.canWoW,
    input.year,
    input.month,
    input.dayStart,
    input.dayEnd,
    input.dowOffset,
    input.wowPrevStart,
    input.wowPrevEnd,
  )
  return { curDateRange, prevCtsDateRange }
}

// ── Period Aggregates ──

export interface PeriodAggregatesInput {
  readonly periodCTS: readonly CategoryTimeSalesRecord[]
  readonly periodPrevCTS: readonly CategoryTimeSalesRecord[]
  readonly activeCompMode: ComparisonMode
  readonly daily: ReadonlyMap<number, DailyRecord>
  readonly prevDaily: ReadonlyMap<string, { sales: number; discount: number; customers: number }>
  readonly dayStart: number
  readonly dayEnd: number
  readonly wowPrevStart: number
  readonly wowPrevEnd: number
  readonly year: number
  readonly month: number
}

export interface PeriodAggregatesResult {
  readonly periodCurSales: { sales: number; customers: number }
  readonly periodPrevSales: { sales: number; customers: number }
  readonly curTotalQty: number
  readonly prevTotalQty: number
  readonly priceMix: { priceEffect: number; mixEffect: number } | null
  readonly hasQuantity: boolean
}

export function buildPeriodAggregates(input: PeriodAggregatesInput): PeriodAggregatesResult {
  const periodCurSales = aggregatePeriodCurSales(
    input.periodCTS,
    input.daily,
    input.dayStart,
    input.dayEnd,
  )
  const periodPrevSales = aggregatePeriodPrevSales(
    input.periodPrevCTS,
    input.activeCompMode,
    input.daily,
    input.prevDaily,
    input.dayStart,
    input.dayEnd,
    input.wowPrevStart,
    input.wowPrevEnd,
    input.year,
    input.month,
  )
  const curTotalQty = aggregateTotalQuantity(input.periodCTS)
  const prevTotalQty = aggregateTotalQuantity(input.periodPrevCTS)
  const priceMix =
    input.periodCTS.length > 0 && input.periodPrevCTS.length > 0
      ? decomposePriceMix(input.periodCTS, input.periodPrevCTS)
      : null
  const hasQuantity = curTotalQty > 0 && prevTotalQty > 0

  return { periodCurSales, periodPrevSales, curTotalQty, prevTotalQty, priceMix, hasQuantity }
}

// ── PI Summary (folded into factorData computation) ──

export interface PISummaryInput {
  readonly activeLevel: number
  readonly hasQuantity: boolean
  readonly prevCust: number
  readonly curCust: number
  readonly prevTotalQty: number
  readonly curTotalQty: number
  readonly prevSales: number
  readonly curSales: number
}

export function buildPISummary(input: PISummaryInput) {
  return calculatePISummary(
    input.activeLevel,
    input.hasQuantity,
    input.prevCust,
    input.curCust,
    input.prevTotalQty,
    input.curTotalQty,
    input.prevSales,
    input.curSales,
    calculateItemsPerCustomer,
    calculateAveragePricePerItem,
  )
}
