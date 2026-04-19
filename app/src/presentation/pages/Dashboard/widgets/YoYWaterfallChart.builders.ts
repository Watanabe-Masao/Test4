/**
 * YoYWaterfallChart の pure builder 関数群
 *
 * React hooks を使わない純粋関数。useMemo 集約用。
 *
 * unify-period-analysis Phase 2: 比較先 DateRange の解決は
 * `domain/models/comparisonRangeResolver` に集約された唯一の経路を通る。
 *
 * Phase 2b: 比較結果は `ComparisonResolvedRange` 単一契約として返す。
 * caller は `comparison.range` / `comparison.provenance` を読み、
 * `alignmentMap` / `effectivePeriod2` を直接参照しない。
 *
 * Phase 6.5-5b: 量合計 (curTotalQty / prevTotalQty) を `CategoryDailySeries`
 * の `grandTotals.salesQty` 経由で取得するよう切替。priceMix 計算の
 * `decomposePriceMix(periodCTS, periodPrevCTS)` は `dept|line|klass` leaf-grain
 * key を必要とする Shapley 5-factor のための **intentional permanent floor**
 * として残す (`CategoryDailySeries` は dept 単位のため leaf-grain を持たない)。
 */
import type { DateRange } from '@/domain/models/calendar'
import type { DailyRecord } from '@/domain/models/record'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { CategoryDailySeries } from '@/application/hooks/categoryDaily/CategoryDailyBundle.types'
import {
  resolveAndEnrichComparisonRange,
  type ComparisonResolvedRange,
} from '@/domain/models/comparisonRangeResolver'
import {
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
  /**
   * Phase 2b: scope を渡すと `comparison.provenance` に
   * `sourceDate` / `comparisonRange` が埋まる。`null` / 未指定でも動作する。
   */
  readonly comparisonScope?: ComparisonScope | null
}

export interface DateRangesResult {
  readonly curDateRange: DateRange
  /**
   * Phase 2b: 比較先 DateRange + provenance を 1 つに束ねた単一契約。
   * - `comparison.range`: 解決された比較先範囲（canWoW=false なら undefined）
   * - `comparison.provenance.mode / mappingKind / dowOffset / fallbackApplied`: resolver 由来
   * - `comparison.provenance.sourceDate / comparisonRange`: scope 由来（scope 未指定なら undefined）
   */
  readonly comparison: ComparisonResolvedRange
}

export function buildDateRanges(input: DateRangesInput): DateRangesResult {
  const curDateRange: DateRange = input.overrideDateRange ?? {
    from: { year: input.year, month: input.month, day: input.dayStart },
    to: { year: input.year, month: input.month, day: input.dayEnd },
  }
  const comparison = resolveAndEnrichComparisonRange(
    {
      mode: input.activeCompMode === 'wow' ? 'wow' : 'yoy',
      year: input.year,
      month: input.month,
      dayStart: input.dayStart,
      dayEnd: input.dayEnd,
      dowOffset: input.dowOffset,
      canWoW: input.canWoW,
      wowPrevStart: input.wowPrevStart,
      wowPrevEnd: input.wowPrevEnd,
    },
    input.comparisonScope,
  )
  return { curDateRange, comparison }
}

// ── Period Aggregates ──

export interface PeriodAggregatesInput {
  /**
   * Shapley 5-factor decomposition 用 leaf-grain 入力 (intentional permanent floor)。
   * `CategoryDailySeries` は dept 単位のため `dept|line|klass` key を必要とする
   * `decomposePriceMix` に渡せない。Phase 6.5 Step B scope 外。
   */
  readonly periodCTS: readonly CategoryLeafDailyEntry[]
  /** Shapley 5-factor 比較期入力 (同上、intentional permanent floor) */
  readonly periodPrevCTS: readonly CategoryLeafDailyEntry[]
  /**
   * Phase 6.5-5b: 数量合計は `ctx.categoryDailyLane.bundle.currentSeries` から
   * 取得する。null のときは 0 (bundle 未ロード時の flicker 回避)。
   */
  readonly categoryDailySeries: CategoryDailySeries | null
  /** Phase 6.5-5b: 比較期の数量合計用 CategoryDailySeries */
  readonly categoryDailyPrevSeries: CategoryDailySeries | null
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
  const periodCurSales = aggregatePeriodCurSales(input.daily, input.dayStart, input.dayEnd)
  const periodPrevSales = aggregatePeriodPrevSales(
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
  // Phase 6.5-5b: 量合計は lane 経由 (CategoryDailySeries.grandTotals.salesQty)
  const curTotalQty = aggregateTotalQuantity(input.categoryDailySeries)
  const prevTotalQty = aggregateTotalQuantity(input.categoryDailyPrevSeries)
  // Shapley priceMix 分解は leaf-grain 必須 (intentional permanent floor)
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
