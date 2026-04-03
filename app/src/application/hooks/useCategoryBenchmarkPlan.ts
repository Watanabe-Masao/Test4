/**
 * useCategoryBenchmarkPlan — CategoryBenchmark/BoxPlot の Screen Query Plan
 *
 * CategoryBenchmarkChart と CategoryBoxPlotChart が共通で使用する
 * DuckDB クエリを plan として一元管理する。
 *
 * - categoryHierarchyHandler で dept/line ドロップダウン候補を取得
 * - categoryBenchmarkHandler でベンチマークデータを取得
 * - categoryBenchmarkTrendHandler でトレンドデータを取得
 * - 子 component は ViewModel 経由でデータを受け取る（INV-RUN-03）
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H4 component に acquisition logic 禁止
 */
import { useMemo } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryHierarchyHandler,
  type CategoryHierarchyInput,
  type CategoryHierarchyOutput,
} from '@/application/queries/advanced/CategoryHierarchyHandler'
import {
  categoryBenchmarkHandler,
  type CategoryBenchmarkInput,
  type CategoryBenchmarkOutput,
} from '@/application/queries/advanced/CategoryBenchmarkHandler'
import {
  categoryBenchmarkTrendHandler,
  type CategoryBenchmarkTrendInput,
  type CategoryBenchmarkTrendOutput,
} from '@/application/queries/advanced/CategoryBenchmarkTrendHandler'

type CategoryLevel = 'department' | 'line' | 'klass'

export interface CategoryBenchmarkPlanParams {
  readonly executor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly level: CategoryLevel
  readonly parentDeptCode: string
  readonly parentLineCode: string
}

export interface CategoryBenchmarkPlanResult {
  readonly deptList: CategoryHierarchyOutput | null
  readonly lineList: CategoryHierarchyOutput | null
  readonly benchmarkData: {
    readonly data: CategoryBenchmarkOutput | null
    readonly isLoading: boolean
    readonly error: Error | null
  }
  readonly trendData: {
    readonly data: CategoryBenchmarkTrendOutput | null
    readonly isLoading: boolean
    readonly error: Error | null
  }
  readonly isLoading: boolean
  readonly error: Error | null
}

/**
 * 入力構築（純粋関数 — テスト可能）
 */
export function buildCategoryBenchmarkInputs(params: CategoryBenchmarkPlanParams): {
  deptInput: CategoryHierarchyInput | null
  lineInput: CategoryHierarchyInput | null
  benchmarkInput: CategoryBenchmarkInput | null
  trendInput: CategoryBenchmarkTrendInput | null
} {
  const { executor, currentDateRange, selectedStoreIds, level, parentDeptCode, parentLineCode } =
    params
  const storeIds = selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined

  if (!executor?.isReady) {
    return { deptInput: null, lineInput: null, benchmarkInput: null, trendInput: null }
  }

  const { fromKey, toKey } = dateRangeToKeys(currentDateRange)

  const deptInput: CategoryHierarchyInput = {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds,
    level: 'department',
  }

  const lineInput: CategoryHierarchyInput = {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds,
    level: 'line',
    parentDeptCode: parentDeptCode || undefined,
  }

  const benchmarkInput: CategoryBenchmarkInput = {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds,
    level,
    parentDeptCode: parentDeptCode || undefined,
    parentLineCode: parentLineCode || undefined,
  }

  const trendInput: CategoryBenchmarkTrendInput = {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds,
    level,
    parentDeptCode: parentDeptCode || undefined,
    parentLineCode: parentLineCode || undefined,
  }

  return { deptInput, lineInput, benchmarkInput, trendInput }
}

export function useCategoryBenchmarkPlan(
  params: CategoryBenchmarkPlanParams,
): CategoryBenchmarkPlanResult {
  const { executor, currentDateRange, selectedStoreIds, level, parentDeptCode, parentLineCode } =
    params

  const { deptInput, lineInput, benchmarkInput, trendInput } = useMemo(
    () =>
      buildCategoryBenchmarkInputs({
        executor,
        currentDateRange,
        selectedStoreIds,
        level,
        parentDeptCode,
        parentLineCode,
      }),
    [executor, currentDateRange, selectedStoreIds, level, parentDeptCode, parentLineCode],
  )

  const dept = useQueryWithHandler(executor, categoryHierarchyHandler, deptInput)
  const line = useQueryWithHandler(executor, categoryHierarchyHandler, lineInput)
  const benchmark = useQueryWithHandler(executor, categoryBenchmarkHandler, benchmarkInput)
  const trend = useQueryWithHandler(executor, categoryBenchmarkTrendHandler, trendInput)

  return useMemo(
    () => ({
      deptList: dept.data,
      lineList: line.data,
      benchmarkData: {
        data: benchmark.data,
        isLoading: benchmark.isLoading,
        error: benchmark.error,
      },
      trendData: {
        data: trend.data,
        isLoading: trend.isLoading,
        error: trend.error,
      },
      isLoading: dept.isLoading || line.isLoading || benchmark.isLoading || trend.isLoading,
      error: dept.error ?? line.error ?? benchmark.error ?? trend.error ?? null,
    }),
    [
      dept.data,
      dept.isLoading,
      dept.error,
      line.data,
      line.isLoading,
      line.error,
      benchmark.data,
      benchmark.isLoading,
      benchmark.error,
      trend.data,
      trend.isLoading,
      trend.error,
    ],
  )
}
