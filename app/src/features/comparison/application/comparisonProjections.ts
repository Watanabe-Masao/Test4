/**
 * 比較KPI・曜日ギャップの純粋関数群
 *
 * useComparisonModule.ts から分離した純粋関数。
 * React に依存せず、単体テスト可能。
 */
import { applyPreset } from '@/domain/models/PeriodSelection'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
import type { ComparisonProjectionContext } from './ComparisonProjectionContext'
import type { PrevYearMonthlyKpi, PrevYearMonthlyKpiEntry } from './comparisonTypes'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import { calcSameDowOffset } from '@/features/comparison/application/dowOffset'
import {
  analyzeDowGap,
  analyzeDowGapActualDay,
  ZERO_DOW_GAP_ANALYSIS,
} from '@/domain/calculations/dowGapAnalysis'

const dowGapDefault = ZERO_DOW_GAP_ANALYSIS
import type { DowGapDailyData } from '@/domain/calculations/dowGapAnalysis'
import { DAYS_PER_WEEK } from '@/domain/constants'
import {
  aggregateKpiByAlignment,
  aggregateMonthlyTotal,
} from '@/features/comparison/application/buildComparisonAggregation'
import type { SourceDataIndex } from '@/features/comparison/application/sourceDataIndex'
import type { SourceMonthContext } from '@/features/comparison/application/sourceDataIndex'

// ── ゼロ値 ──

const kpiEntryDefault: PrevYearMonthlyKpiEntry = {
  sales: 0,
  customers: 0,
  transactionValue: 0,
  ctsQuantity: 0,
  dailyMapping: [],
  storeContributions: [],
}

const monthlyTotalDefault = { sales: 0, customers: 0, transactionValue: 0, ctsQuantity: 0 }

const kpiDefault: PrevYearMonthlyKpi = {
  hasPrevYear: false,
  sameDow: kpiEntryDefault,
  sameDate: kpiEntryDefault,
  monthlyTotal: monthlyTotalDefault,
  sourceYear: 0,
  sourceMonth: 0,
  dowOffset: 0,
}

// ── KPI 構築 ──

/**
 * 比較スコープから月間KPI（同曜日 + 同日）を構築する純粋関数。
 *
 * useComparisonModule の kpi useMemo から抽出。
 */
export function buildKpiProjection(
  sourceIndex: SourceDataIndex,
  targetIds: readonly string[],
  scope: ComparisonScope,
  ctx: ComparisonProjectionContext,
  sourceMonthCtx: SourceMonthContext,
): PrevYearMonthlyKpi {
  if (targetIds.length === 0) return kpiDefault

  const srcYear = sourceMonthCtx.year
  const srcMonth = sourceMonthCtx.month

  // 月間フル集計用の period1 を構築する。
  // ctx.basisYear/basisMonth は periodSelection.period1.from から抽出済み。
  // elapsedDays cap で month が途中で切れていても、KPI は月全体で集計する。
  const fullMonthPeriod1 = {
    from: { year: ctx.basisYear, month: ctx.basisMonth, day: 1 },
    to: {
      year: ctx.basisYear,
      month: ctx.basisMonth,
      day: new Date(ctx.basisYear, ctx.basisMonth, 0).getDate(),
    },
  }

  // 同曜日KPI: scope の alignmentMap は elapsedDays でキャップ済みのため、
  // 月間フル集計用に elapsedDays なしで再構築する。
  // activePreset は常に prevYearSameDow を指定し、sameDayOfWeek alignmentMode を確保する。
  const sameDowPeriod2 = applyPreset(fullMonthPeriod1, 'prevYearSameDow', ctx.period2)
  const sameDowScope = buildComparisonScope({
    period1: fullMonthPeriod1,
    period2: sameDowPeriod2,
    activePreset: 'prevYearSameDow',
    comparisonEnabled: true, // type satisfaction — not consumed by buildComparisonScope
  })
  const sameDow = aggregateKpiByAlignment(sourceIndex, targetIds, sameDowScope.alignmentMap)

  // 同日KPI: DOW offset なしで再構築
  // period2 も再算出する（元の period2 は DOW offset が焼込済みのため）
  const sameDatePeriod2 = applyPreset(fullMonthPeriod1, 'prevYearSameMonth', ctx.period2)
  const sameDateScope = buildComparisonScope({
    period1: fullMonthPeriod1,
    period2: sameDatePeriod2,
    activePreset: 'prevYearSameMonth',
    comparisonEnabled: true, // type satisfaction — not consumed by buildComparisonScope
  })
  const sameDate = aggregateKpiByAlignment(sourceIndex, targetIds, sameDateScope.alignmentMap)

  // 月全体の dowOffset（月初の曜日差分）
  const dowOffset = calcSameDowOffset(
    scope.period1.from.year,
    scope.period1.from.month,
    srcYear,
    srcMonth,
  )

  // 月間トータル: alignment不要、ソース月全日の単純合計。
  // 当期の取り込み期間に影響されない固定値。予算前年比等に使用。
  const monthlyTotal = aggregateMonthlyTotal(sourceIndex, targetIds, sourceMonthCtx)

  return {
    hasPrevYear: true,
    sameDow,
    sameDate,
    monthlyTotal,
    sourceYear: srcYear,
    sourceMonth: srcMonth,
    dowOffset,
  }
}

// ── 曜日ギャップ構築 ──

/**
 * KPI から曜日ギャップ分析を構築する純粋関数。
 *
 * useComparisonModule の dowGap useMemo から抽出。
 */
export function buildDowGapProjection(
  kpi: PrevYearMonthlyKpi,
  currentYear: number,
  currentMonth: number,
  currentAverageDailySales: number,
): DowGapAnalysis {
  if (!kpi.hasPrevYear || kpi.sourceYear === 0) return dowGapDefault

  // 前年曜日別の合計売上 + 日次データ配列を構築
  const prevDowSales = [0, 0, 0, 0, 0, 0, 0]
  const salesByDow: number[][] = Array.from({ length: DAYS_PER_WEEK }, () => [])
  const customersByDow: number[][] = Array.from({ length: DAYS_PER_WEEK }, () => [])
  let totalCustomers = 0

  for (const row of kpi.sameDate.dailyMapping) {
    const dow = new Date(row.prevYear, row.prevMonth - 1, row.prevDay).getDay()
    prevDowSales[dow] += row.prevSales
    salesByDow[dow].push(row.prevSales)
    customersByDow[dow].push(row.prevCustomers)
    totalCustomers += row.prevCustomers
  }

  const dailyAverageCustomers =
    kpi.sameDate.dailyMapping.length > 0 ? totalCustomers / kpi.sameDate.dailyMapping.length : 0

  const dailyData: DowGapDailyData = {
    salesByDow,
    customersByDow,
    dailyAverageCustomers,
  }

  const base = analyzeDowGap(
    currentYear,
    currentMonth,
    kpi.sourceYear,
    kpi.sourceMonth,
    currentAverageDailySales,
    prevDowSales,
    dailyData,
  )

  if (kpi.sameDate.dailyMapping.length > 0 && kpi.sameDow.dailyMapping.length > 0) {
    const actualDay = analyzeDowGapActualDay(
      kpi.sameDate.dailyMapping,
      kpi.sameDow.dailyMapping,
      kpi.sourceYear,
      kpi.sourceMonth,
      currentYear,
      currentMonth,
    )
    return { ...base, actualDayImpact: actualDay }
  }

  return base
}
