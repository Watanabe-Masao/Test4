/**
 * buildComparisonAggregation — alignmentMap ベースの比較集計（pure functions）
 *
 * ComparisonScope.alignmentMap の sourceDate → targetDate 対応で集計する。
 *
 * ## 設計原則
 *
 * - 入力は SourceDataIndex + alignmentMap
 * - SourceDataIndex が allAgg のリナンバリングを封じ込め、CalendarDate で参照
 * - 月跨ぎは alignmentMap + SourceDataIndex が吸収（消費者は意識しない）
 * - 出力は PrevYearData / PrevYearMonthlyKpi と型互換
 */
import type { AlignmentEntry } from '@/domain/models/ComparisonScope'
import type { DiscountEntry } from '@/domain/models/record'
import { addDiscountEntries, ZERO_DISCOUNT_ENTRIES } from '@/domain/models/record'
import { safeDivide, calculateTransactionValue } from '@/domain/calculations/utils'
import type {
  PrevYearDailyEntry,
  PrevYearMonthlyKpiEntry,
  PrevYearMonthlyTotal,
  StoreContribution,
  DayMappingRow,
} from '@/application/comparison/comparisonTypes'
import type { SourceDataIndex, SourceMonthContext } from '@/application/comparison/sourceDataIndex'

// ── re-export（後方互換） ──

export type { SourceMonthContext } from '@/application/comparison/sourceDataIndex'

// ── 日別集計（PrevYearData 互換出力） ──

/** aggregateByAlignmentMap の出力 — PrevYearData と互換 */
export interface ComparisonDailyResult {
  readonly hasPrevYear: boolean
  readonly daily: ReadonlyMap<string, PrevYearDailyEntry>
  readonly totalSales: number
  readonly totalDiscount: number
  readonly totalCustomers: number
  readonly totalCtsQuantity: number
  readonly grossSales: number
  readonly discountRate: number
  readonly totalDiscountEntries: readonly DiscountEntry[]
}

const EMPTY_DAILY: ComparisonDailyResult = {
  hasPrevYear: false,
  daily: new Map(),
  totalSales: 0,
  totalDiscount: 0,
  totalCustomers: 0,
  totalCtsQuantity: 0,
  grossSales: 0,
  discountRate: 0,
  totalDiscountEntries: ZERO_DISCOUNT_ENTRIES,
}

// ── 日別集計の内部構成関数 ──

/** 日別の売上・値引・客数・販売点数を蓄積する */
function accumulateDailyValues(
  sourceIndex: SourceDataIndex,
  targetIds: readonly string[],
  alignmentMap: readonly AlignmentEntry[],
): {
  daily: Map<string, { sales: number; discount: number; customers: number; ctsQuantity: number }>
  dayDiscountEntries: Map<string, DiscountEntry[]>
} {
  const daily = new Map<
    string,
    { sales: number; discount: number; customers: number; ctsQuantity: number }
  >()
  const dayDiscountEntries = new Map<string, DiscountEntry[]>()

  for (const entry of alignmentMap) {
    const tgtKey = entry.targetDayKey

    for (const storeId of targetIds) {
      const summary = sourceIndex.getSummary(storeId, entry.sourceDate)
      if (!summary) continue

      const sales = summary.sales ?? 0
      const discount = summary.discount ?? 0
      // customers: summary に JOIN 済みの値を使い、月跨ぎで 0 の場合は getFlowers にフォールバック
      const summaryCustomers = summary.customers ?? 0
      const customers =
        summaryCustomers > 0
          ? summaryCustomers
          : (sourceIndex.getFlowers(storeId, entry.sourceDate)?.customers ?? 0)

      const ctsQuantity = sourceIndex.getCtsQuantity(storeId, entry.sourceDate)

      const existing = daily.get(tgtKey)
      if (existing) {
        daily.set(tgtKey, {
          sales: existing.sales + sales,
          discount: existing.discount + discount,
          customers: existing.customers + customers,
          ctsQuantity: existing.ctsQuantity + ctsQuantity,
        })
      } else {
        daily.set(tgtKey, { sales, discount, customers, ctsQuantity })
      }

      // 売変種別内訳を蓄積
      const existingEntries = dayDiscountEntries.get(tgtKey) ?? [
        ...ZERO_DISCOUNT_ENTRIES.map((e) => ({ ...e })),
      ]
      dayDiscountEntries.set(
        tgtKey,
        addDiscountEntries(existingEntries, summary.discountEntries) as DiscountEntry[],
      )
    }
  }

  return { daily, dayDiscountEntries }
}

/**
 * 合計値・率を算出する。
 *
 * alignmentMap は buildEffectivePeriod1 で既に elapsedDays キャップ済みのため、
 * daily Map の全エントリを合計すればよい。
 */
function summarizeDailyTotals(
  daily: ReadonlyMap<
    string,
    { sales: number; discount: number; customers: number; ctsQuantity: number }
  >,
  dayDiscountEntries: ReadonlyMap<string, DiscountEntry[]>,
): {
  totalSales: number
  totalDiscount: number
  totalCustomers: number
  totalCtsQuantity: number
  grossSales: number
  discountRate: number
  totalDiscountEntries: readonly DiscountEntry[]
} {
  let totalSales = 0
  let totalDiscount = 0
  let totalCustomers = 0
  let totalCtsQuantity = 0
  let totalDiscountEntriesAcc: DiscountEntry[] = [...ZERO_DISCOUNT_ENTRIES.map((e) => ({ ...e }))]

  for (const [key, val] of daily) {
    totalSales += val.sales
    totalDiscount += val.discount
    totalCustomers += val.customers
    totalCtsQuantity += val.ctsQuantity
    const dayEntries = dayDiscountEntries.get(key)
    if (dayEntries) {
      totalDiscountEntriesAcc = addDiscountEntries(
        totalDiscountEntriesAcc,
        dayEntries,
      ) as DiscountEntry[]
    }
  }

  return {
    totalSales,
    totalDiscount,
    totalCustomers,
    totalCtsQuantity,
    grossSales: totalSales + totalDiscount,
    discountRate: safeDivide(totalDiscount, totalSales),
    totalDiscountEntries: totalDiscountEntriesAcc,
  }
}

// ── 日別集計（公開API） ──

/**
 * alignmentMap ベースの日別集計。
 *
 * 内部で accumulateDailyValues → summarizeDailyTotals を合成する。
 *
 * @param sourceIndex  SourceDataIndex（CalendarDate ベースの前年データ参照）
 * @param targetIds    対象店舗ID配列
 * @param alignmentMap ComparisonScope.alignmentMap（elapsedDays キャップ済み）
 */
export function aggregateDailyByAlignment(
  sourceIndex: SourceDataIndex,
  targetIds: readonly string[],
  alignmentMap: readonly AlignmentEntry[],
): ComparisonDailyResult {
  if (targetIds.length === 0 || alignmentMap.length === 0) return EMPTY_DAILY

  const { daily, dayDiscountEntries } = accumulateDailyValues(sourceIndex, targetIds, alignmentMap)
  const totals = summarizeDailyTotals(daily, dayDiscountEntries)

  // Attach per-type discount breakdown to each daily entry
  const dailyWithEntries = new Map(
    Array.from(daily.entries()).map(([key, val]) => {
      const entries = dayDiscountEntries.get(key)
      const discountEntries: Record<string, number> | undefined = entries
        ? Object.fromEntries(entries.map((e) => [e.type, e.amount]))
        : undefined
      return [
        key,
        {
          sales: val.sales,
          discount: val.discount,
          customers: val.customers,
          ctsQuantity: val.ctsQuantity,
          discountEntries,
        },
      ]
    }),
  )

  return {
    hasPrevYear: true,
    daily: dailyWithEntries,
    ...totals,
  }
}

// ── 月間KPI集計（PrevYearMonthlyKpiEntry 互換出力） ──

/**
 * alignmentMap ベースの月間KPI集計。
 *
 * 全 alignmentMap エントリに対して集計し、
 * PrevYearMonthlyKpiEntry 互換の結果を返す。
 */
export function aggregateKpiByAlignment(
  sourceIndex: SourceDataIndex,
  targetIds: readonly string[],
  alignmentMap: readonly AlignmentEntry[],
): PrevYearMonthlyKpiEntry {
  if (targetIds.length === 0 || alignmentMap.length === 0) {
    return {
      sales: 0,
      customers: 0,
      transactionValue: 0,
      ctsQuantity: 0,
      dailyMapping: [],
      storeContributions: [],
    }
  }

  let totalSales = 0
  let totalCustomers = 0
  let totalCtsQuantity = 0
  const dayMap = new Map<
    number,
    {
      prevDay: number
      prevMonth: number
      prevYear: number
      sales: number
      customers: number
      ctsQuantity: number
    }
  >()
  const storeContributions: StoreContribution[] = []

  for (const entry of alignmentMap) {
    const tgtDay = entry.targetDate.day

    for (const storeId of targetIds) {
      const summary = sourceIndex.getSummary(storeId, entry.sourceDate)
      if (!summary) continue

      const sales = summary.sales ?? 0
      totalSales += sales

      const summaryCustomers = summary.customers ?? 0
      const customers =
        summaryCustomers > 0
          ? summaryCustomers
          : (sourceIndex.getFlowers(storeId, entry.sourceDate)?.customers ?? 0)
      totalCustomers += customers

      const ctsQty = sourceIndex.getCtsQuantity(storeId, entry.sourceDate)
      totalCtsQuantity += ctsQty

      const discount = summary.discount ?? 0

      storeContributions.push({
        storeId,
        originalDay: entry.sourceDate.day,
        mappedDay: tgtDay,
        sales,
        customers,
        discount,
        ctsQuantity: ctsQty,
      })

      const existing = dayMap.get(tgtDay)
      if (existing) {
        existing.sales += sales
        existing.customers += customers
        existing.ctsQuantity += ctsQty
      } else {
        dayMap.set(tgtDay, {
          prevDay: entry.sourceDate.day,
          prevMonth: entry.sourceDate.month,
          prevYear: entry.sourceDate.year,
          sales,
          customers,
          ctsQuantity: ctsQty,
        })
      }
    }
  }

  const dailyMapping: DayMappingRow[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([currentDay, d]) => ({
      prevDay: d.prevDay,
      prevMonth: d.prevMonth,
      prevYear: d.prevYear,
      currentDay,
      prevSales: d.sales,
      prevCustomers: d.customers,
      prevCtsQuantity: d.ctsQuantity,
    }))

  return {
    sales: totalSales,
    customers: totalCustomers,
    transactionValue: calculateTransactionValue(totalSales, totalCustomers),
    ctsQuantity: totalCtsQuantity,
    dailyMapping,
    storeContributions,
  }
}

/**
 * 前年月間トータルを集計する（alignment不要）。
 *
 * alignmentMap を経由せず、sourceIndex のソース月全日データを直接合計する。
 * 当期の取り込み期間（elapsedDays）や period1 の範囲に一切影響されない。
 *
 * ## 使用場面
 *
 * - 予算前年比（budget / monthlyTotal.sales）
 * - 予算成長率（(budget - monthlyTotal.sales) / monthlyTotal.sales）
 * - 月間固定の参考値表示
 *
 * ## alignment経由との違い
 *
 * - aggregateKpiByAlignment: 当期の各日→前年対応日→合計（period1依存）
 * - aggregateMonthlyTotal: ソース月の1日〜末日→合計（period1非依存）
 */
export function aggregateMonthlyTotal(
  sourceIndex: SourceDataIndex,
  targetIds: readonly string[],
  sourceMonthCtx: SourceMonthContext,
): PrevYearMonthlyTotal {
  let totalSales = 0
  let totalCustomers = 0
  let totalCtsQuantity = 0

  for (let day = 1; day <= sourceMonthCtx.daysInMonth; day++) {
    const date = { year: sourceMonthCtx.year, month: sourceMonthCtx.month, day }
    for (const storeId of targetIds) {
      const summary = sourceIndex.getSummary(storeId, date)
      if (!summary) continue
      totalSales += summary.sales ?? 0
      const monthlySummaryCustomers = summary.customers ?? 0
      totalCustomers +=
        monthlySummaryCustomers > 0
          ? monthlySummaryCustomers
          : (sourceIndex.getFlowers(storeId, date)?.customers ?? 0)

      totalCtsQuantity += sourceIndex.getCtsQuantity(storeId, date)
    }
  }

  return {
    sales: totalSales,
    customers: totalCustomers,
    transactionValue: calculateTransactionValue(totalSales, totalCustomers),
    ctsQuantity: totalCtsQuantity,
  }
}
