/**
 * useHeatmapPlan — HeatmapChart の Screen Query Plan
 *
 * HeatmapChart が必要とする DuckDB クエリを plan として一元管理する。
 *
 * - HourDowMatrixPairHandler で cur/prev を1本化（INV-RUN-02）
 * - LevelAggregationHandler で dept/line/klass ドロップダウン候補を取得
 * - 子 component は props 経由でデータを受け取る（INV-RUN-03）
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H2 比較は pair/bundle 契約
 * @guard H4 component に acquisition logic 禁止
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { hourDowMatrixPairHandler } from '@/application/queries/cts/HourDowMatrixPairHandler'
import type { HourDowMatrixInput } from '@/application/queries/cts/HourDowMatrixHandler'
import {
  levelAggregationHandler,
  type LevelAggregationInput,
} from '@/application/queries/cts/LevelAggregationHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'
import type { PairedQueryOutput } from '@/application/queries/PairedQueryContract'
import type { HourDowMatrixOutput } from '@/application/queries/cts/HourDowMatrixHandler'
import type { LevelAggregationOutput } from '@/application/queries/cts/LevelAggregationHandler'

export interface HeatmapPlanParams {
  readonly executor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly deptCode: string
  readonly lineCode: string
  readonly klassCode: string
}

export interface HeatmapPlanResult {
  readonly matrix: {
    readonly data: PairedQueryOutput<HourDowMatrixOutput> | null
    readonly isLoading: boolean
    readonly error: Error | null
  }
  readonly departments: LevelAggregationOutput | null
  readonly lines: LevelAggregationOutput | null
  readonly klasses: LevelAggregationOutput | null
  readonly isLoading: boolean
  readonly error: Error | null
}

/**
 * 入力構築（純粋関数 — テスト可能）
 */
export function buildHeatmapPlanInputs(params: HeatmapPlanParams): {
  matrixInput: PairedInput<HourDowMatrixInput> | null
  deptInput: LevelAggregationInput | null
  lineInput: LevelAggregationInput | null
  klassInput: LevelAggregationInput | null
} {
  const { executor, currentDateRange, selectedStoreIds, prevYearScope, deptCode, lineCode } = params
  const storeIds = selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined

  if (!executor?.isReady) {
    return { matrixInput: null, deptInput: null, lineInput: null, klassInput: null }
  }

  const { fromKey, toKey } = dateRangeToKeys(currentDateRange)

  // Matrix: pair handler で当年+前年を並列取得
  const matrixBase: PairedInput<HourDowMatrixInput> = {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds,
    deptCode: deptCode || undefined,
    lineCode: lineCode || undefined,
    klassCode: params.klassCode || undefined,
  }
  let matrixInput: PairedInput<HourDowMatrixInput>
  if (prevYearScope?.dateRange) {
    const { fromKey: pFrom, toKey: pTo } = dateRangeToKeys(prevYearScope.dateRange)
    matrixInput = { ...matrixBase, comparisonDateFrom: pFrom, comparisonDateTo: pTo }
  } else {
    matrixInput = matrixBase
  }

  // Hierarchy dropdowns
  const deptInput: LevelAggregationInput = {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds,
    level: 'department',
  }

  const lineInput: LevelAggregationInput = {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds,
    level: 'line',
    deptCode: deptCode || undefined,
  }

  const klassInput: LevelAggregationInput = {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds,
    level: 'klass',
    deptCode: deptCode || undefined,
    lineCode: lineCode || undefined,
  }

  return { matrixInput, deptInput, lineInput, klassInput }
}

export function useHeatmapPlan(params: HeatmapPlanParams): HeatmapPlanResult {
  const {
    executor,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
    deptCode,
    lineCode,
    klassCode,
  } = params

  const { matrixInput, deptInput, lineInput, klassInput } = useMemo(
    () =>
      buildHeatmapPlanInputs({
        executor,
        currentDateRange,
        selectedStoreIds,
        prevYearScope,
        deptCode,
        lineCode,
        klassCode,
      }),
    [executor, currentDateRange, selectedStoreIds, prevYearScope, deptCode, lineCode, klassCode],
  )

  const matrix = useQueryWithHandler(executor, hourDowMatrixPairHandler, matrixInput)
  const dept = useQueryWithHandler(executor, levelAggregationHandler, deptInput)
  const line = useQueryWithHandler(executor, levelAggregationHandler, lineInput)
  const klass = useQueryWithHandler(executor, levelAggregationHandler, klassInput)

  return useMemo(
    () => ({
      matrix: {
        data: matrix.data,
        isLoading: matrix.isLoading,
        error: matrix.error,
      },
      departments: dept.data,
      lines: line.data,
      klasses: klass.data,
      isLoading: matrix.isLoading || dept.isLoading || line.isLoading || klass.isLoading,
      error: matrix.error ?? dept.error ?? line.error ?? klass.error ?? null,
    }),
    [
      matrix.data,
      matrix.isLoading,
      matrix.error,
      dept.data,
      dept.isLoading,
      dept.error,
      line.data,
      line.isLoading,
      line.error,
      klass.data,
      klass.isLoading,
      klass.error,
    ],
  )
}
