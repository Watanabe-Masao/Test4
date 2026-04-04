/**
 * useComparisonModule — 比較サブシステムの唯一のファサード
 *
 * scope構築 → データ読込 → daily/kpi集計 → dowGap算出 を一括で行い、
 * 比較データの唯一の生産者として機能する。UIはこの1フックだけ呼べばいい。
 */
import { useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useStoreSelection } from '@/application/hooks/useStoreSelection'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
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
import { prepareComparisonInputs } from '@/features/comparison/application/comparisonDataPrep'
import { aggregateDailyByAlignment } from '@/features/comparison/application/buildComparisonAggregation'
import {
  buildKpiProjection,
  buildDowGapProjection,
} from '@/features/comparison/application/comparisonProjections'

// ── 出力型 ──

/** useComparisonModule の出力 — 比較サブシステムの唯一のインターフェース */
export interface ComparisonModule {
  /** 比較スコープ（比較OFF or periodSelection 未確定なら null） */
  readonly scope: ComparisonScope | null
  /** データ読込状態 */
  readonly loadStatus: ComparisonLoadStatus
  /** 日別比較データ（旧 PrevYearData 互換） */
  readonly daily: PrevYearData
  /** 月間KPI（旧 PrevYearMonthlyKpi 互換） */
  readonly kpi: PrevYearMonthlyKpi
  /** 曜日ギャップ分析 */
  readonly dowGap: DowGapAnalysis
  /** 前年スコープ（DuckDB日付範囲 + 客数 + dowOffset） */
  readonly prevYearScope: PrevYearScope | undefined
}

// ── ゼロ値 ──

const EMPTY_DAILY: PrevYearData = {
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

const ZERO_KPI_ENTRY: PrevYearMonthlyKpiEntry = {
  sales: 0,
  customers: 0,
  transactionValue: 0,
  ctsQuantity: 0,
  dailyMapping: [],
  storeContributions: [],
}

const EMPTY_KPI: PrevYearMonthlyKpi = {
  hasPrevYear: false,
  sameDow: ZERO_KPI_ENTRY,
  sameDate: ZERO_KPI_ENTRY,
  monthlyTotal: { sales: 0, customers: 0, transactionValue: 0, ctsQuantity: 0 },
  sourceYear: 0,
  sourceMonth: 0,
  dowOffset: 0,
}

const IDLE_STATUS: ComparisonLoadStatus = {
  status: 'idle',
  requestedRanges: [],
  loadedRanges: [],
  lastError: null,
}

// ── フック ──

/**
 * 比較サブシステムの唯一のファサード。
 *
 * 内部で scope 構築 → data load → daily/kpi 集計 → dowGap 算出 を行い、
 * UI が必要とするすべての比較データを単一の ComparisonModule として返す。
 *
 * @param periodSelection 期間選択（source of truth）
 * @param elapsedDays 当期の経過日数（elapsedDays cap 用）
 * @param currentAverageDailySales 当期の日平均売上（dowGap用）
 */
export function useComparisonModule(
  periodSelection: PeriodSelection,
  elapsedDays: number | undefined,
  currentAverageDailySales: number,
): ComparisonModule {
  const prevYear = useDataStore((s) => s.appData.prevYear)
  const { selectedStoreIds, isAllStores } = useStoreSelection()

  // 1. ComparisonScope 構築
  const scope = useMemo((): ComparisonScope | null => {
    if (!periodSelection.comparisonEnabled) return null
    return buildComparisonScope(periodSelection, elapsedDays)
  }, [periodSelection, elapsedDays])

  // 2. データ読込（side effect）
  const loadStatus = useLoadComparisonData(scope)

  // 3. 共通入力データ準備（SourceDataIndex 構築 + targetIds）
  // SourceMonthContext は scope.sourceMonth（alignmentMap の最頻月）を使う。
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

  // 4. 日別集計（PrevYearData 互換）
  const daily = useMemo((): PrevYearData => {
    if (!scope || !inputs) return EMPTY_DAILY
    return aggregateDailyByAlignment(inputs.sourceIndex, inputs.targetIds, scope.alignmentMap)
  }, [scope, inputs])

  // 5. 月間KPI集計（PrevYearMonthlyKpi 互換）
  const kpi = useMemo((): PrevYearMonthlyKpi => {
    if (!scope || !inputs) return EMPTY_KPI
    const { year, month } = scope.sourceMonth
    return buildKpiProjection(inputs.sourceIndex, inputs.targetIds, scope, periodSelection, {
      year,
      month,
      daysInMonth: new Date(year, month, 0).getDate(),
    })
  }, [scope, inputs, periodSelection])

  // 6. 曜日ギャップ分析
  const dowGap = useMemo(
    (): DowGapAnalysis =>
      buildDowGapProjection(
        kpi,
        periodSelection.period1.from.year,
        periodSelection.period1.from.month,
        currentAverageDailySales,
      ),
    [kpi, currentAverageDailySales, periodSelection],
  )

  // 7. 前年スコープ（DuckDB日付範囲 + 客数）
  // scope が存在すれば日付範囲を提供する。daily.hasPrevYear に依存しない。
  // IndexedDB に前年データがなくても DuckDB に前年データがある場合があるため、
  // DuckDB ベースのチャート（TimeSlotChart 等）が前年データを取得できるようにする。
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
    loadStatus: scope ? loadStatus : IDLE_STATUS,
    daily,
    kpi,
    dowGap,
    prevYearScope,
  }
}
