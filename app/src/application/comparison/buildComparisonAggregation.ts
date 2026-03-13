/**
 * buildComparisonAggregation — alignmentMap ベースの比較集計（pure functions）
 *
 * origDay - offset ロジックを完全に廃止し、
 * ComparisonScope.alignmentMap の sourceDate → targetDate 対応で集計する。
 *
 * ## 設計原則
 *
 * - 入力は alignmentMap + 既存の store 集計データ
 * - 日付は sourceDayKey / targetDate.day で引く（day番号操作なし）
 * - 月跨ぎは alignmentMap が吸収済み → resolveSourceDay で allAgg のリナンバリング空間に変換
 * - 出力は PrevYearData / PrevYearMonthlyKpi と型互換
 */
import type { AlignmentEntry } from '@/domain/models/ComparisonScope'
import type { CalendarDate } from '@/domain/models/CalendarDate'
import type { ClassifiedSalesDaySummary } from '@/domain/models/ClassifiedSales'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models'
import type { DiscountEntry } from '@/domain/models'
import { addDiscountEntries, ZERO_DISCOUNT_ENTRIES } from '@/domain/models'
import { safeDivide, calculateTransactionValue } from '@/domain/calculations/utils'
import type {
  PrevYearDailyEntry,
  PrevYearMonthlyKpiEntry,
  StoreContribution,
  DayMappingRow,
} from '@/application/comparison/comparisonTypes'

// ── allAgg 日番号変換 ──

/**
 * allAgg のソース月コンテキスト。
 *
 * mergeAdjacentMonthRecords が生成するリナンバリング空間と
 * alignmentMap の実日付を対応付けるために使う。
 */
export interface SourceMonthContext {
  readonly year: number
  readonly month: number
  readonly daysInMonth: number
}

/**
 * alignmentMap の sourceDate を allAgg のリナンバリング日番号に変換する。
 *
 * allAgg は mergeAdjacentMonthRecords により以下のリナンバリング済み:
 * - 当月: day そのまま (1〜daysInMonth)
 * - 翌月: daysInMonth + day (例: 28日の月なら3月1日→29)
 * - 前月: day - daysInPrevMonth (負の値)
 *
 * alignmentMap は実日付 (sourceDate.year/month/day) を持つため、
 * 月跨ぎ時にこの変換が必要。
 */
function resolveSourceDay(sourceDate: CalendarDate, ctx: SourceMonthContext): number {
  // 同月 → day そのまま
  if (sourceDate.year === ctx.year && sourceDate.month === ctx.month) {
    return sourceDate.day
  }
  // 翌月 → overflow: daysInMonth + day
  const nextMonth = ctx.month === 12 ? 1 : ctx.month + 1
  const nextYear = ctx.month === 12 ? ctx.year + 1 : ctx.year
  if (sourceDate.year === nextYear && sourceDate.month === nextMonth) {
    return ctx.daysInMonth + sourceDate.day
  }
  // 前月 → underflow: day - daysInPrevMonth（≤0 になる）
  // mergeAdjacentMonthRecords と同じリナンバリング規則に従う
  const prevMonth = ctx.month === 1 ? 12 : ctx.month - 1
  const prevYear = ctx.month === 1 ? ctx.year - 1 : ctx.year
  if (sourceDate.year === prevYear && sourceDate.month === prevMonth) {
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate()
    return sourceDate.day - daysInPrevMonth
  }
  // それ以外（±1ヶ月を超える場合）→ データが見つからない可能性が高い
  return sourceDate.day
}

// ── 日別集計（PrevYearData 互換出力） ──

/** aggregateByAlignmentMap の出力 — PrevYearData と互換 */
export interface ComparisonDailyResult {
  readonly hasPrevYear: boolean
  readonly daily: ReadonlyMap<string, PrevYearDailyEntry>
  readonly totalSales: number
  readonly totalDiscount: number
  readonly totalCustomers: number
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
  grossSales: 0,
  discountRate: 0,
  totalDiscountEntries: ZERO_DISCOUNT_ENTRIES,
}

// ── 日別集計の内部構成関数 ──

/** 日別の売上・値引・客数を蓄積する */
function accumulateDailyValues(
  allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>,
  flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined,
  targetIds: readonly string[],
  alignmentMap: readonly AlignmentEntry[],
  sourceMonthCtx?: SourceMonthContext,
): {
  daily: Map<string, { sales: number; discount: number; customers: number }>
  dayDiscountEntries: Map<string, DiscountEntry[]>
} {
  const daily = new Map<string, { sales: number; discount: number; customers: number }>()
  const dayDiscountEntries = new Map<string, DiscountEntry[]>()

  for (const entry of alignmentMap) {
    // allAgg のリナンバリング空間に変換（月跨ぎ対応）
    const srcDay = sourceMonthCtx
      ? resolveSourceDay(entry.sourceDate, sourceMonthCtx)
      : entry.sourceDate.day
    const tgtKey = entry.targetDayKey

    for (const storeId of targetIds) {
      const storeDays = allAgg[storeId]
      if (!storeDays) continue

      // mergeAdjacentMonthRecords が OVERFLOW_DAYS 分のデータを
      // ソース月の日番号空間にリナンバリング済み
      const summary = storeDays[srcDay]
      if (!summary) continue

      const sales = summary.sales ?? 0
      const discount = summary.discount ?? 0

      // 客数は花ファイルから取得
      const flowerEntry = flowersIndex?.[storeId]?.[srcDay]
      const customers = flowerEntry?.customers ?? 0

      const existing = daily.get(tgtKey)
      if (existing) {
        daily.set(tgtKey, {
          sales: existing.sales + sales,
          discount: existing.discount + discount,
          customers: existing.customers + customers,
        })
      } else {
        daily.set(tgtKey, { sales, discount, customers })
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
  daily: ReadonlyMap<string, { sales: number; discount: number; customers: number }>,
  dayDiscountEntries: ReadonlyMap<string, DiscountEntry[]>,
): {
  totalSales: number
  totalDiscount: number
  totalCustomers: number
  grossSales: number
  discountRate: number
  totalDiscountEntries: readonly DiscountEntry[]
} {
  let totalSales = 0
  let totalDiscount = 0
  let totalCustomers = 0
  let totalDiscountEntriesAcc: DiscountEntry[] = [...ZERO_DISCOUNT_ENTRIES.map((e) => ({ ...e }))]

  for (const [key, val] of daily) {
    totalSales += val.sales
    totalDiscount += val.discount
    totalCustomers += val.customers
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
 * @param allAgg      aggregateAllStores() の出力（store → day → summary）
 * @param flowersIndex indexByStoreDay() の出力（客数ルックアップ用）
 * @param targetIds   対象店舗ID配列
 * @param alignmentMap ComparisonScope.alignmentMap（elapsedDays キャップ済み）
 */
export function aggregateDailyByAlignment(
  allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>,
  flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined,
  targetIds: readonly string[],
  alignmentMap: readonly AlignmentEntry[],
  sourceMonthCtx?: SourceMonthContext,
): ComparisonDailyResult {
  if (targetIds.length === 0 || alignmentMap.length === 0) return EMPTY_DAILY

  const { daily, dayDiscountEntries } = accumulateDailyValues(
    allAgg,
    flowersIndex,
    targetIds,
    alignmentMap,
    sourceMonthCtx,
  )
  const totals = summarizeDailyTotals(daily, dayDiscountEntries)

  return {
    hasPrevYear: true,
    daily,
    ...totals,
  }
}

// ── 月間KPI集計（PrevYearMonthlyKpiEntry 互換出力） ──

/**
 * alignmentMap ベースの月間KPI集計。
 *
 * 旧 offset 版は廃止済み。
 * 全 alignmentMap エントリに対して集計し、
 * PrevYearMonthlyKpiEntry 互換の結果を返す。
 */
export function aggregateKpiByAlignment(
  allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>,
  flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined,
  targetIds: readonly string[],
  alignmentMap: readonly AlignmentEntry[],
  sourceMonthCtx?: SourceMonthContext,
): PrevYearMonthlyKpiEntry {
  if (targetIds.length === 0 || alignmentMap.length === 0) {
    return {
      sales: 0,
      customers: 0,
      transactionValue: 0,
      dailyMapping: [],
      storeContributions: [],
    }
  }

  let totalSales = 0
  let totalCustomers = 0
  const dayMap = new Map<number, { prevDay: number; sales: number; customers: number }>()
  const storeContributions: StoreContribution[] = []

  for (const entry of alignmentMap) {
    // allAgg のリナンバリング空間に変換（月跨ぎ対応）
    const srcDay = sourceMonthCtx
      ? resolveSourceDay(entry.sourceDate, sourceMonthCtx)
      : entry.sourceDate.day
    const tgtDay = entry.targetDate.day

    for (const storeId of targetIds) {
      const storeDays = allAgg[storeId]
      if (!storeDays) continue

      const summary = storeDays[srcDay]
      if (!summary) continue

      const sales = summary.sales ?? 0
      totalSales += sales

      const flowerEntry = flowersIndex?.[storeId]?.[srcDay]
      const customers = flowerEntry?.customers ?? 0
      totalCustomers += customers

      storeContributions.push({
        storeId,
        originalDay: srcDay,
        mappedDay: tgtDay,
        sales,
        customers,
      })

      const existing = dayMap.get(tgtDay)
      if (existing) {
        existing.sales += sales
        existing.customers += customers
      } else {
        dayMap.set(tgtDay, { prevDay: srcDay, sales, customers })
      }
    }
  }

  const dailyMapping: DayMappingRow[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([currentDay, d]) => ({
      prevDay: d.prevDay,
      currentDay,
      prevSales: d.sales,
      prevCustomers: d.customers,
    }))

  return {
    sales: totalSales,
    customers: totalCustomers,
    transactionValue: calculateTransactionValue(totalSales, totalCustomers),
    dailyMapping,
    storeContributions,
  }
}
