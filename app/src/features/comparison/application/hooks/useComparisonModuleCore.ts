/**
 * useComparisonModuleCore — PeriodSelection 非依存の比較サブシステム core
 *
 * phase-6-optional-comparison-projection Phase O5:
 * useComparisonModule から PeriodSelection 依存を外した core hook。
 * scope と projectionContext を受け取り、data load → 集計 → 出力を行う。
 *
 * features/comparison/ 内部は PeriodSelection を知らない (import guard で保証)。
 * 旧 signature の wrapper は app/src/application/hooks/useComparisonModule.ts に配置。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useStoreSelection } from '@/application/hooks/useStoreSelection'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { ComparisonLoadStatus } from '@/application/hooks/useLoadComparisonData'
import {
  useLoadComparisonData,
  getStoredAdjacentFlowersRecords,
} from '@/application/hooks/useLoadComparisonData'
import type {
  PrevYearData,
  PrevYearMonthlyKpi,
  PrevYearMonthlyKpiEntry,
} from '@/features/comparison/application/comparisonTypes'
import type { PrevYearScope } from '@/domain/models/ComparisonScope'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import { ZERO_DISCOUNT_ENTRIES } from '@/domain/models/record'

const zeroDiscountEntries = ZERO_DISCOUNT_ENTRIES
import { prepareComparisonInputs } from '@/features/comparison/application/comparisonDataPrep'
import { aggregateDailyByAlignment } from '@/features/comparison/application/buildComparisonAggregation'
import {
  buildKpiProjection,
  buildDowGapProjection,
} from '@/features/comparison/application/comparisonProjections'
import type { ComparisonProjectionContext } from '@/features/comparison/application/ComparisonProjectionContext'

import type { ComparisonModule } from './useComparisonModule'

// ── ゼロ値 ──

const dailyDefault: PrevYearData = {
  hasPrevYear: false,
  source: 'disabled',
  daily: new Map(),
  totalSales: 0,
  totalDiscount: 0,
  totalCustomers: 0,
  totalCtsQuantity: 0,
  grossSales: 0,
  discountRate: 0,
  totalDiscountEntries: zeroDiscountEntries,
}

const kpiEntryDefault: PrevYearMonthlyKpiEntry = {
  sales: 0,
  customers: 0,
  transactionValue: 0,
  ctsQuantity: 0,
  dailyMapping: [],
  storeContributions: [],
}

const kpiDefault: PrevYearMonthlyKpi = {
  hasPrevYear: false,
  sameDow: kpiEntryDefault,
  sameDate: kpiEntryDefault,
  monthlyTotal: { sales: 0, customers: 0, transactionValue: 0, ctsQuantity: 0 },
  sourceYear: 0,
  sourceMonth: 0,
  dowOffset: 0,
}

const idleStatus: ComparisonLoadStatus = {
  status: 'idle',
  requestedRanges: [],
  loadedRanges: [],
  lastError: null,
}

// ── Core Hook 入力 ──

export interface UseComparisonModuleCoreInput {
  /** 比較スコープ (null = 比較無効) */
  readonly scope: ComparisonScope | null
  /** 最小 projection context (PeriodSelection 非依存) */
  readonly projectionContext: ComparisonProjectionContext
  /** 当期の日平均売上 (dowGap 用) */
  readonly currentAverageDailySales: number
}

// ── Core Hook ──

/**
 * PeriodSelection 非依存の比較サブシステム core。
 *
 * scope 構築と PeriodSelection → ComparisonProjectionContext 変換は
 * caller (wrapper or direct consumer) の責務。
 */
export function useComparisonModuleCore({
  scope,
  projectionContext,
  currentAverageDailySales,
}: UseComparisonModuleCoreInput): ComparisonModule {
  const prevYear = useDataStore((s) => s.appData.prevYear)
  const { selectedStoreIds, isAllStores } = useStoreSelection()

  // 1. データ読込（side effect）
  const loadStatus = useLoadComparisonData(scope)

  // 2. 共通入力データ準備（SourceDataIndex 構築 + targetIds）
  const inputs = useMemo(() => {
    if (!scope) return null
    const { year, month } = scope.sourceMonth
    return prepareComparisonInputs(
      prevYear,
      selectedStoreIds,
      isAllStores,
      { year, month, daysInMonth: new Date(year, month, 0).getDate() },
      getStoredAdjacentFlowersRecords(),
    )
  }, [prevYear, selectedStoreIds, isAllStores, scope])

  // 3. 日別集計（PrevYearData 互換）
  const daily = useMemo((): PrevYearData => {
    if (!scope || !inputs) return dailyDefault
    return aggregateDailyByAlignment(inputs.sourceIndex, inputs.targetIds, scope.alignmentMap)
  }, [scope, inputs])

  // 4. 月間KPI集計
  const kpi = useMemo((): PrevYearMonthlyKpi => {
    if (!scope || !inputs) return kpiDefault
    const { year, month } = scope.sourceMonth
    return buildKpiProjection(inputs.sourceIndex, inputs.targetIds, scope, projectionContext, {
      year,
      month,
      daysInMonth: new Date(year, month, 0).getDate(),
    })
  }, [scope, inputs, projectionContext])

  // 5. 曜日ギャップ分析
  const dowGap = useMemo(
    (): DowGapAnalysis =>
      buildDowGapProjection(
        kpi,
        projectionContext.basisYear,
        projectionContext.basisMonth,
        currentAverageDailySales,
      ),
    [kpi, currentAverageDailySales, projectionContext],
  )

  // 6. 前年スコープ
  const prevYearScope = useMemo((): PrevYearScope | undefined => {
    if (!scope) return undefined
    return {
      dateRange: scope.effectivePeriod2,
      totalCustomers: daily.totalCustomers,
      dowOffset: scope.dowOffset,
    }
  }, [scope, daily.totalCustomers])

  return {
    scope,
    loadStatus: scope ? loadStatus : idleStatus,
    daily,
    kpi,
    dowGap,
    prevYearScope,
  }
}
