/**
 * useCategoryTrendPlan — カテゴリ別日次トレンドの Screen Query Plan
 *
 * Asymmetric Comparison: current topN（ユーザー選択）≠ prev topN（100固定）。
 * 前年データは意図的に over-fetch し、描画時に current top-N へフィルタする。
 * createPairedHandler の対称前提には合わないため、専用 plan として設計。
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H4 component に acquisition logic 禁止
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import type { PlanComparisonProvenance } from '@/domain/models/ComparisonWindow'
import { currentOnly, yoyWindow } from '@/domain/models/ComparisonWindow'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryDailyTrendHandler,
  type CategoryDailyTrendInput,
  type CategoryDailyTrendOutput,
} from '@/application/queries/cts/CategoryDailyTrendHandler'

/** 前年クエリの固定 topN — current の top-N カテゴリが前年にも存在することを保証 */
const PREV_YEAR_TOP_N = 100

export interface CategoryTrendPlanInput {
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly level: 'department' | 'line' | 'klass'
  readonly topN: number
  readonly deptCode?: string
  readonly lineCode?: string
  readonly dow?: readonly number[]
  /** 前年日付範囲（undefined なら前年クエリは実行しない） */
  readonly prevYearDateRange?: DateRange
  /** UI の showYoY トグル */
  readonly showYoY: boolean
}

export interface CategoryTrendPlanResult {
  readonly currentData: CategoryDailyTrendOutput | null
  readonly prevData: CategoryDailyTrendOutput | null
  readonly comparisonProvenance: PlanComparisonProvenance
  readonly isLoading: boolean
  readonly error: Error | null
}

export function useCategoryTrendPlan(
  executor: QueryExecutor | null,
  input: CategoryTrendPlanInput,
): CategoryTrendPlanResult {
  const {
    currentDateRange,
    selectedStoreIds,
    level,
    topN,
    deptCode,
    lineCode,
    dow,
    prevYearDateRange,
    showYoY,
  } = input

  const storeIds = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )

  // ── Current period: user-selected topN ──
  const currentInput = useMemo<CategoryDailyTrendInput>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, level, topN, deptCode, lineCode, dow }
  }, [currentDateRange, storeIds, level, topN, deptCode, lineCode, dow])

  const {
    data: currentData,
    error,
    isLoading: currentLoading,
  } = useQueryWithHandler(executor, categoryDailyTrendHandler, currentInput)

  // ── Previous year: fixed topN=100 (asymmetric over-fetch) ──
  const hasPrevYear = showYoY && prevYearDateRange != null
  const prevInput = useMemo<CategoryDailyTrendInput | null>(() => {
    if (!hasPrevYear || !prevYearDateRange) return null
    const { fromKey, toKey } = dateRangeToKeys(prevYearDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds,
      level,
      topN: PREV_YEAR_TOP_N,
      deptCode,
      lineCode,
      dow,
      isPrevYear: true,
    }
  }, [hasPrevYear, prevYearDateRange, storeIds, level, deptCode, lineCode, dow])

  const { data: prevData, isLoading: prevLoading } = useQueryWithHandler(
    executor,
    categoryDailyTrendHandler,
    prevInput,
  )

  const comparisonProvenance = useMemo<PlanComparisonProvenance>(() => {
    if (!hasPrevYear || !prevYearDateRange) {
      return { window: currentOnly(), comparisonAvailable: false }
    }
    return { window: yoyWindow(prevYearDateRange), comparisonAvailable: prevData != null }
  }, [hasPrevYear, prevYearDateRange, prevData])

  return {
    currentData: currentData ?? null,
    prevData: prevData ?? null,
    comparisonProvenance,
    isLoading: currentLoading || prevLoading,
    error: error ?? null,
  }
}
