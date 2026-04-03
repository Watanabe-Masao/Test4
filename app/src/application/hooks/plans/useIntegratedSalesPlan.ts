/**
 * useIntegratedSalesPlan — IntegratedSales 系列の Screen Query Plan
 *
 * dailyQuantityPairHandler + useMultiMovingAverage のクエリ取得を
 * plan として一元管理し、useIntegratedSalesState から取得責務を分離する。
 *
 * presentation/components/charts/useIntegratedSalesPlan.ts から移動。
 * 層境界修正: presentation 由来の型を domain/models/ChartViewMode.ts に抽出済み。
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H2 比較は pair/bundle 契約 — dailyQuantityPairHandler で cur/prev 一括取得
 * @guard H4 component に acquisition logic 禁止
 */
import { useMemo } from 'react'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { RightAxisMode, ViewType } from '@/domain/models/ChartViewMode'
import type { AnalysisMetric } from '@/domain/models/temporal'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  dailyQuantityPairHandler,
  type DailyQuantityPairInput,
} from '@/application/queries/summary/DailyQuantityPairHandler'
import {
  useMultiMovingAverage,
  type MovingAverageOverlays,
} from '@/application/hooks/useMultiMovingAverage'
import { aggregateDailyQuantity } from './integratedSalesAggregation'

export interface IntegratedSalesPlanParams {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly daysInMonth: number
  readonly rightAxisMode: RightAxisMode
  readonly showMovingAverage: boolean
  readonly dailyView: ViewType
}

export interface DailyQuantityData {
  readonly current: ReadonlyMap<number, number>
  readonly prev: ReadonlyMap<number, number>
}

export interface IntegratedSalesPlanResult {
  readonly dailyQuantity: DailyQuantityData | undefined
  readonly maOverlays: MovingAverageOverlays
}

/**
 * 日別点数クエリの入力を構築（純粋関数）。
 */
export function buildQtyPairInput(
  currentDateRange: DateRange,
  storeIds: readonly string[] | undefined,
  prevYearDateRange: DateRange | undefined,
): DailyQuantityPairInput {
  const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
  const base: DailyQuantityPairInput = { dateFrom: fromKey, dateTo: toKey, storeIds }
  if (prevYearDateRange) {
    const { fromKey: pFrom, toKey: pTo } = dateRangeToKeys(prevYearDateRange)
    return { ...base, prevDateFrom: pFrom, prevDateTo: pTo }
  }
  return base
}

/** rightAxisMode → AnalysisMetric マッピング（純粋関数） */
const RIGHT_AXIS_MA_METRIC: Partial<Record<RightAxisMode, AnalysisMetric>> = {
  quantity: 'quantity',
  customers: 'customers',
  discount: 'discount',
}

export function useIntegratedSalesPlan(
  params: IntegratedSalesPlanParams,
): IntegratedSalesPlanResult {
  const {
    queryExecutor,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
    daysInMonth,
    rightAxisMode,
    showMovingAverage,
    dailyView,
  } = params

  // ── 日別点数データ（DuckDB 由来、当年+前年を並列取得） ──
  const storeIds = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )
  const prevYearDateRange = prevYearScope?.dateRange
  const qtyPairInput = useMemo(
    () => buildQtyPairInput(currentDateRange, storeIds, prevYearDateRange),
    [currentDateRange, storeIds, prevYearDateRange],
  )
  const { data: qtyPairOut } = useQueryWithHandler(
    queryExecutor,
    dailyQuantityPairHandler,
    qtyPairInput,
  )
  const dailyQuantity = useMemo(
    () =>
      aggregateDailyQuantity(
        qtyPairOut?.current,
        qtyPairOut?.prev,
        prevYearDateRange,
        currentDateRange,
        daysInMonth,
      ),
    [qtyPairOut, prevYearDateRange, currentDateRange, daysInMonth],
  )

  // ── 移動平均 overlay ──
  const maOverlays = useMultiMovingAverage(
    queryExecutor ?? null,
    currentDateRange,
    selectedStoreIds,
    prevYearScope,
    RIGHT_AXIS_MA_METRIC[rightAxisMode] ?? null,
    showMovingAverage && dailyView === 'standard',
  )

  return { dailyQuantity, maOverlays }
}
