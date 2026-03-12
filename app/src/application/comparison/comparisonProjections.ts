/**
 * 比較KPI・曜日ギャップの純粋関数群
 *
 * useComparisonModule.ts から分離した純粋関数。
 * React に依存せず、単体テスト可能。
 */
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import { applyPreset } from '@/domain/models/PeriodSelection'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
import type { PrevYearMonthlyKpi, PrevYearMonthlyKpiEntry } from './comparisonTypes'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models'
import type { ClassifiedSalesDaySummary } from '@/domain/models'
import { calcSameDowOffset } from '@/application/comparison/resolveComparisonFrame'
import {
  analyzeDowGap,
  analyzeDowGapActualDay,
  ZERO_DOW_GAP_ANALYSIS,
} from '@/domain/calculations/dowGapAnalysis'
import { aggregateKpiByAlignment } from '@/application/comparison/buildComparisonAggregation'

// ── ゼロ値 ──

const ZERO_KPI_ENTRY: PrevYearMonthlyKpiEntry = {
  sales: 0,
  customers: 0,
  transactionValue: 0,
  dailyMapping: [],
  storeContributions: [],
}

const EMPTY_KPI: PrevYearMonthlyKpi = {
  hasPrevYear: false,
  sameDow: ZERO_KPI_ENTRY,
  sameDate: ZERO_KPI_ENTRY,
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
  allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>,
  flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined,
  targetIds: readonly string[],
  scope: ComparisonScope,
  periodSelection: PeriodSelection,
): PrevYearMonthlyKpi {
  if (targetIds.length === 0) return EMPTY_KPI

  const srcYear = scope.period2.from.year
  const srcMonth = scope.period2.from.month

  // 同曜日KPI: scope の alignmentMap は既に DOW offset 込み
  const sameDow = aggregateKpiByAlignment(allAgg, flowersIndex, targetIds, scope.alignmentMap)

  // 同日KPI: DOW offset なしで再構築
  // period2 も再算出する（元の period2 は DOW offset が焼込済みのため）
  const sameDatePeriod2 = applyPreset(
    periodSelection.period1,
    'prevYearSameMonth',
    periodSelection.period2,
  )
  const sameDateScope = buildComparisonScope({
    ...periodSelection,
    period2: sameDatePeriod2,
    activePreset: 'prevYearSameMonth',
  })
  const sameDate = aggregateKpiByAlignment(
    allAgg,
    flowersIndex,
    targetIds,
    sameDateScope.alignmentMap,
  )

  // 月全体の dowOffset（月初の曜日差分）
  const dowOffset = calcSameDowOffset(
    scope.period1.from.year,
    scope.period1.from.month,
    srcYear,
    srcMonth,
  )

  return {
    hasPrevYear: true,
    sameDow,
    sameDate,
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
  if (!kpi.hasPrevYear || kpi.sourceYear === 0) return ZERO_DOW_GAP_ANALYSIS

  // 前年曜日別売上を構築
  const prevDowSales = [0, 0, 0, 0, 0, 0, 0]
  for (const row of kpi.sameDate.dailyMapping) {
    const dow = new Date(kpi.sourceYear, kpi.sourceMonth - 1, row.prevDay).getDay()
    prevDowSales[dow] += row.prevSales
  }

  const base = analyzeDowGap(
    currentYear,
    currentMonth,
    kpi.sourceYear,
    kpi.sourceMonth,
    currentAverageDailySales,
    prevDowSales,
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
