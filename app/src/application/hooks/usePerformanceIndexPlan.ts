/**
 * usePerformanceIndexPlan — PerformanceIndex 系列の Screen Query Plan
 *
 * CategoryPerformanceChart + StorePIComparisonChart が必要とする
 * DuckDB クエリを plan として一元管理する。
 *
 * - LevelAggregationPairHandler で cur/prev を1本化（INV-RUN-02）
 * - StoreCategoryPIHandler で店舗×カテゴリ PI を取得
 * - 子 component は props 経由でデータを受け取る（INV-RUN-03）
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H2 比較は pair/bundle 契約
 * @guard H4 component に acquisition logic 禁止
 */
import { useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { levelAggregationPairHandler } from '@/application/queries/cts/LevelAggregationPairHandler'
import {
  storeCategoryPIHandler,
  type StoreCategoryPIInput,
  type StoreCategoryPIOutput,
} from '@/application/queries/cts/StoreCategoryPIHandler'
import type { PairedQueryOutput } from '@/application/queries/PairedQueryContract'
import type { PairedInput } from '@/application/queries/createPairedHandler'
import type {
  LevelAggregationInput,
  LevelAggregationOutput,
} from '@/application/queries/cts/LevelAggregationHandler'

type Level = 'department' | 'line' | 'klass'

export interface PerformanceIndexPlanParams {
  readonly executor: QueryExecutor | null
  /** CategoryPerformanceChart の日付範囲（ブラシ選択時は childDateRange） */
  readonly categoryDateRange: DateRange
  /** 月全体の日付範囲（StoreCategoryPI 用） */
  readonly currentDateRange: DateRange
  readonly prevYearScope?: PrevYearScope
  readonly selectedStoreIds: ReadonlySet<string>
  readonly categoryLevel: Level
  readonly storePILevel: Level
}

export interface PerformanceIndexPlanResult {
  readonly categoryPerformance: {
    readonly data: PairedQueryOutput<LevelAggregationOutput> | null
    readonly isLoading: boolean
    readonly error: Error | null
  }
  readonly storeCategoryPI: {
    readonly data: StoreCategoryPIOutput | null
    readonly isLoading: boolean
    readonly error: Error | null
  }
  readonly isLoading: boolean
  readonly error: Error | null
}

/**
 * 入力構築（純粋関数 — テスト可能）
 */
export function buildPlanInputs(params: PerformanceIndexPlanParams): {
  categoryInput: PairedInput<LevelAggregationInput> | null
  storeCatInput: StoreCategoryPIInput | null
} {
  const { executor, categoryDateRange, currentDateRange, prevYearScope, selectedStoreIds } = params
  const storeIds = selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined

  // CategoryPerformance: pair 化された LevelAggregation
  let categoryInput: PairedInput<LevelAggregationInput> | null = null
  if (executor?.isReady) {
    const { fromKey, toKey } = dateRangeToKeys(categoryDateRange)
    const base: LevelAggregationInput = {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds,
      level: params.categoryLevel,
    }

    if (prevYearScope) {
      const { fromKey: prevFrom, toKey: prevTo } = dateRangeToKeys(prevYearScope.dateRange)
      categoryInput = {
        ...base,
        comparisonDateFrom: prevFrom,
        comparisonDateTo: prevTo,
      }
    } else {
      categoryInput = base
    }
  }

  // StoreCategoryPI
  let storeCatInput: StoreCategoryPIInput | null = null
  if (executor?.isReady) {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    storeCatInput = {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds,
      level: params.storePILevel,
    }
  }

  return { categoryInput, storeCatInput }
}

export function usePerformanceIndexPlan(
  params: PerformanceIndexPlanParams,
): PerformanceIndexPlanResult {
  const {
    executor,
    categoryDateRange,
    currentDateRange,
    prevYearScope,
    selectedStoreIds,
    categoryLevel,
    storePILevel,
  } = params

  const { categoryInput, storeCatInput } = useMemo(
    () =>
      buildPlanInputs({
        executor,
        categoryDateRange,
        currentDateRange,
        prevYearScope,
        selectedStoreIds,
        categoryLevel,
        storePILevel,
      }),
    [
      executor,
      categoryDateRange,
      currentDateRange,
      prevYearScope,
      selectedStoreIds,
      categoryLevel,
      storePILevel,
    ],
  )

  const catPerf = useQueryWithHandler(executor, levelAggregationPairHandler, categoryInput)
  const storeCatPI = useQueryWithHandler(executor, storeCategoryPIHandler, storeCatInput)

  return useMemo(
    () => ({
      categoryPerformance: {
        data: catPerf.data,
        isLoading: catPerf.isLoading,
        error: catPerf.error,
      },
      storeCategoryPI: {
        data: storeCatPI.data,
        isLoading: storeCatPI.isLoading,
        error: storeCatPI.error,
      },
      isLoading: catPerf.isLoading || storeCatPI.isLoading,
      error: catPerf.error ?? storeCatPI.error ?? null,
    }),
    [
      catPerf.data,
      catPerf.isLoading,
      catPerf.error,
      storeCatPI.data,
      storeCatPI.isLoading,
      storeCatPI.error,
    ],
  )
}
