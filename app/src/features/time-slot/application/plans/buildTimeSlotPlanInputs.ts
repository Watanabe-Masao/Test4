/**
 * buildTimeSlotPlanInputs — useTimeSlotPlan の query 入力構築（純粋関数）
 *
 * React 非依存。useTimeSlotPlan から query input 組み立てロジックを分離して
 * 単体テスト可能にする。
 *
 * @responsibility R:unclassified
 */
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { HourlyAggregationInput } from '@/application/queries/cts/HourlyAggregationHandler'
import type { DistinctDayCountInput } from '@/application/queries/cts/DistinctDayCountHandler'
import { buildWowRange } from '@/application/usecases/timeSlotDataLogic'

export type CompMode = 'yoy' | 'wow'

export interface TimeSlotPlanInputsParams {
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly compMode: CompMode
  readonly hierarchy: {
    readonly deptCode?: string
    readonly lineCode?: string
    readonly klassCode?: string
  }
}

export interface TimeSlotPlanInputs {
  readonly curHourlyInput: HourlyAggregationInput
  readonly compHourlyInput: HourlyAggregationInput | null
  readonly curDayCountInput: DistinctDayCountInput
  readonly compDayCountInput: DistinctDayCountInput | null
}

function toKeys(range: DateRange): { dateFrom: string; dateTo: string } {
  const { fromKey, toKey } = dateRangeToKeys(range)
  return { dateFrom: fromKey, dateTo: toKey }
}

function storeIdsArray(ids: ReadonlySet<string>): readonly string[] | undefined {
  return ids.size > 0 ? [...ids] : undefined
}

/**
 * TimeSlotChart の query 入力を純粋関数で構築する。
 *
 * 比較期間の解決:
 * - compMode='yoy' → prevYearScope.dateRange + isPrevYear=true
 * - compMode='wow' → 7 日前の同範囲 + isPrevYear=false（同年データ）
 */
export function buildTimeSlotPlanInputs(params: TimeSlotPlanInputsParams): TimeSlotPlanInputs {
  const { currentDateRange, selectedStoreIds, prevYearScope, compMode, hierarchy } = params
  const storeIds = storeIdsArray(selectedStoreIds)
  const compRange = compMode === 'wow' ? buildWowRange(currentDateRange) : prevYearScope?.dateRange
  const compIsPrevYear = compMode === 'yoy'

  const curHourlyInput: HourlyAggregationInput = {
    ...toKeys(currentDateRange),
    storeIds,
    ...hierarchy,
    isPrevYear: false,
  }
  const compHourlyInput: HourlyAggregationInput | null = compRange
    ? { ...toKeys(compRange), storeIds, ...hierarchy, isPrevYear: compIsPrevYear }
    : null
  const curDayCountInput: DistinctDayCountInput = {
    ...toKeys(currentDateRange),
    storeIds,
    isPrevYear: false,
  }
  const compDayCountInput: DistinctDayCountInput | null = compRange
    ? { ...toKeys(compRange), storeIds, isPrevYear: compIsPrevYear }
    : null

  return { curHourlyInput, compHourlyInput, curDayCountInput, compDayCountInput }
}
