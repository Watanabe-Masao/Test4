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
 * - 月跨ぎは alignmentMap が吸収済み
 * - 出力は PrevYearData / PrevYearMonthlyKpi と型互換
 */
import type { AlignmentEntry } from '@/domain/models/ComparisonScope'
import type { ClassifiedSalesDaySummary } from '@/domain/models/ClassifiedSales'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models'
import type { DiscountEntry } from '@/domain/models'
import { addDiscountEntries, ZERO_DISCOUNT_ENTRIES } from '@/domain/models'
import { safeDivide, calculateTransactionValue } from '@/domain/calculations/utils'
import type { PrevYearDailyEntry } from '@/application/hooks/usePrevYearData'
import type {
  PrevYearMonthlyKpiEntry,
  StoreContribution,
  DayMappingRow,
} from '@/application/hooks/usePrevYearMonthlyKpi'

// ── 日別集計（PrevYearData 互換出力） ──

/** aggregateByAlignmentMap の出力 — PrevYearData と互換 */
export interface ComparisonDailyResult {
  readonly hasPrevYear: boolean
  readonly daily: ReadonlyMap<number, PrevYearDailyEntry>
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
): {
  daily: Map<number, { sales: number; discount: number; customers: number }>
  dayDiscountEntries: Map<number, DiscountEntry[]>
} {
  const daily = new Map<number, { sales: number; discount: number; customers: number }>()
  const dayDiscountEntries = new Map<number, DiscountEntry[]>()

  for (const entry of alignmentMap) {
    const srcDay = entry.sourceDate.day
    const tgtDay = entry.targetDate.day

    for (const storeId of targetIds) {
      const storeDays = allAgg[storeId]
      if (!storeDays) continue

      // mergeAdjacentMonthRecords が OVERFLOW_DAYS 分のデータを
      // ソース月の日番号空間にリナンバリング済みなので、srcDay で直接引く
      const summary = storeDays[srcDay]
      if (!summary) continue

      const sales = summary.sales ?? 0
      const discount = summary.discount ?? 0

      // 客数は花ファイルから取得
      const flowerEntry = flowersIndex?.[storeId]?.[srcDay]
      const customers = flowerEntry?.customers ?? 0

      const existing = daily.get(tgtDay)
      if (existing) {
        daily.set(tgtDay, {
          sales: existing.sales + sales,
          discount: existing.discount + discount,
          customers: existing.customers + customers,
        })
      } else {
        daily.set(tgtDay, { sales, discount, customers })
      }

      // 売変種別内訳を蓄積
      const existingEntries = dayDiscountEntries.get(tgtDay) ?? [
        ...ZERO_DISCOUNT_ENTRIES.map((e) => ({ ...e })),
      ]
      dayDiscountEntries.set(
        tgtDay,
        addDiscountEntries(existingEntries, summary.discountEntries) as DiscountEntry[],
      )
    }
  }

  return { daily, dayDiscountEntries }
}

/** 経過日数フィルタを適用し、合計値・率を算出する */
function summarizeDailyTotals(
  daily: ReadonlyMap<number, { sales: number; discount: number; customers: number }>,
  dayDiscountEntries: ReadonlyMap<number, DiscountEntry[]>,
  elapsedDays?: number,
): {
  totalSales: number
  totalDiscount: number
  totalCustomers: number
  grossSales: number
  discountRate: number
  totalDiscountEntries: readonly DiscountEntry[]
} {
  const maxDay = elapsedDays ?? Infinity
  let totalSales = 0
  let totalDiscount = 0
  let totalCustomers = 0
  let totalDiscountEntriesAcc: DiscountEntry[] = [...ZERO_DISCOUNT_ENTRIES.map((e) => ({ ...e }))]

  for (const [day, val] of daily) {
    if (day <= maxDay) {
      totalSales += val.sales
      totalDiscount += val.discount
      totalCustomers += val.customers
      const dayEntries = dayDiscountEntries.get(day)
      if (dayEntries) {
        totalDiscountEntriesAcc = addDiscountEntries(
          totalDiscountEntriesAcc,
          dayEntries,
        ) as DiscountEntry[]
      }
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
 * @param alignmentMap ComparisonScope.alignmentMap
 * @param elapsedDays  経過日数上限（指定時は total 集計をこの日数分に制限）
 */
export function aggregateDailyByAlignment(
  allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>,
  flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined,
  targetIds: readonly string[],
  alignmentMap: readonly AlignmentEntry[],
  elapsedDays?: number,
): ComparisonDailyResult {
  if (targetIds.length === 0 || alignmentMap.length === 0) return EMPTY_DAILY

  const { daily, dayDiscountEntries } = accumulateDailyValues(
    allAgg,
    flowersIndex,
    targetIds,
    alignmentMap,
  )
  const totals = summarizeDailyTotals(daily, dayDiscountEntries, elapsedDays)

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
 * aggregateWithOffset() の alignmentMap 版。
 * 全 alignmentMap エントリに対して集計し、
 * PrevYearMonthlyKpiEntry 互換の結果を返す。
 */
export function aggregateKpiByAlignment(
  allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>,
  flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined,
  targetIds: readonly string[],
  alignmentMap: readonly AlignmentEntry[],
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
    const srcDay = entry.sourceDate.day
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
