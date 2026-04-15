/**
 * useTimeSlotBundle — 時間帯比較レーンの統合入口
 *
 * unify-period-analysis Phase 6 Step C 実装:
 * `TimeSlotFrame` を入力に、`storeAggregationHandler` を呼び出して raw rows を
 * 取得し、`projectTimeSlotSeries` で `TimeSlotSeries` に変換した
 * `TimeSlotBundle` を返す。
 *
 * ## 構造
 *
 * ```
 * TimeSlotFrame (dateRange + storeIds + comparison)
 *   ↓ buildBaseQueryInput
 * StoreAggregationInput
 *   ↓ useQueryWithHandler(storeAggregationHandler)
 * StoreAggregationRow[]
 *   ↓ projectTimeSlotSeries (pure)
 * TimeSlotSeries
 *   ↓ TimeSlotBundle.currentSeries
 * ```
 *
 * ## 比較期間 (Step C 初期実装の方針)
 *
 * `frame.comparison` が存在する場合、現期間と同じ handler を比較期間 input で
 * もう一度呼び、`comparisonSeries` を埋める。`provenance.mappingKind` は
 * `frame.comparison.alignmentMode` から決定する (`sameDate` /
 * `sameDayOfWeek`)。
 *
 * `frame.comparison` が null の場合は `comparisonSeries: null` /
 * `mappingKind: 'none'` / `comparisonRange: null` を返す。
 *
 * ## 責務
 *
 * - 1) frame を 1-2 個の `StoreAggregationInput` に変換
 * - 2) handler を呼ぶ (現期間 + 必要なら比較期間)
 * - 3) `projectTimeSlotSeries` で raw rows を `TimeSlotSeries` に変換
 * - 4) `provenance` を組み立てて `TimeSlotBundle` として返す
 *
 * ## 非責務
 *
 * - alignment 解決 (frame.comparison が既に解決済み — Phase 2 `comparisonRangeResolver`)
 * - presentation: caller が `bundle.currentSeries` / `bundle.comparisonSeries`
 *   を読む
 *
 * @see TimeSlotBundle.types.ts
 * @see projectTimeSlotSeries.ts
 * @see projects/unify-period-analysis/step-c-timeslot-lane-policy.md
 *
 * @responsibility R:orchestration
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { CalendarDate } from '@/domain/models/CalendarDate'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { storeAggregationHandler } from '@/application/queries/cts/StoreAggregationHandler'
import type { StoreAggregationInput } from '@/application/queries/cts/StoreAggregationHandler'
import { projectTimeSlotSeries } from './projectTimeSlotSeries'
import type {
  TimeSlotFrame,
  TimeSlotBundle,
  TimeSlotMeta,
  TimeSlotProvenance,
} from './TimeSlotBundle.types'

function noProvenance(): TimeSlotProvenance {
  return { mappingKind: 'none', comparisonRange: null }
}

function defaultMeta(): TimeSlotMeta {
  return { usedFallback: false, provenance: noProvenance() }
}

function frameAbsentBundle(): TimeSlotBundle {
  return {
    currentSeries: null,
    comparisonSeries: null,
    meta: defaultMeta(),
    isLoading: false,
    errors: {},
    error: null,
  }
}

function dateToISO(d: CalendarDate): string {
  const m = String(d.month).padStart(2, '0')
  const day = String(d.day).padStart(2, '0')
  return `${d.year}-${m}-${day}`
}

function dayCount(from: CalendarDate, to: CalendarDate): number {
  const a = new Date(from.year, from.month - 1, from.day).getTime()
  const b = new Date(to.year, to.month - 1, to.day).getTime()
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1)
}

interface BuiltInputs {
  readonly current: StoreAggregationInput | null
  readonly comparison: StoreAggregationInput | null
  readonly currentDayCount: number
  readonly comparisonDayCount: number
  readonly storeIdSet: ReadonlySet<string>
  readonly provenance: TimeSlotProvenance
}

function buildInputs(frame: TimeSlotFrame | null): BuiltInputs {
  if (!frame) {
    return {
      current: null,
      comparison: null,
      currentDayCount: 0,
      comparisonDayCount: 0,
      storeIdSet: new Set(),
      provenance: noProvenance(),
    }
  }
  const sortedStoreIds = [...frame.storeIds].sort()
  const storeIdSet = new Set(sortedStoreIds)
  const current: StoreAggregationInput = {
    dateFrom: dateToISO(frame.dateRange.from),
    dateTo: dateToISO(frame.dateRange.to),
    storeIds: sortedStoreIds.length > 0 ? sortedStoreIds : undefined,
  }
  const currentDayCount = dayCount(frame.dateRange.from, frame.dateRange.to)

  if (!frame.comparison) {
    return {
      current,
      comparison: null,
      currentDayCount,
      comparisonDayCount: 0,
      storeIdSet,
      provenance: noProvenance(),
    }
  }

  const cmpRange = frame.comparison.effectivePeriod2
  const comparison: StoreAggregationInput = {
    dateFrom: dateToISO(cmpRange.from),
    dateTo: dateToISO(cmpRange.to),
    storeIds: sortedStoreIds.length > 0 ? sortedStoreIds : undefined,
  }
  const comparisonDayCount = dayCount(cmpRange.from, cmpRange.to)
  const mappingKind: TimeSlotProvenance['mappingKind'] =
    frame.comparison.alignmentMode === 'sameDayOfWeek' ? 'sameDayOfWeek' : 'sameDate'

  return {
    current,
    comparison,
    currentDayCount,
    comparisonDayCount,
    storeIdSet,
    provenance: {
      mappingKind,
      comparisonRange: { from: comparison.dateFrom, to: comparison.dateTo },
    },
  }
}

export function useTimeSlotBundle(
  executor: QueryExecutor | null,
  frame: TimeSlotFrame | null,
): TimeSlotBundle {
  const built = useMemo(() => buildInputs(frame), [frame])

  const {
    data: currentOutput,
    isLoading: currentLoading,
    error: currentError,
  } = useQueryWithHandler(executor, storeAggregationHandler, built.current)

  const {
    data: comparisonOutput,
    isLoading: comparisonLoading,
    error: comparisonError,
  } = useQueryWithHandler(executor, storeAggregationHandler, built.comparison)

  return useMemo<TimeSlotBundle>(() => {
    if (!frame) return frameAbsentBundle()

    const currentSeries = currentOutput
      ? projectTimeSlotSeries(currentOutput.records, {
          dayCount: built.currentDayCount,
          storeIds: built.storeIdSet,
        })
      : null

    const comparisonSeries =
      built.comparison && comparisonOutput
        ? projectTimeSlotSeries(comparisonOutput.records, {
            dayCount: built.comparisonDayCount,
            storeIds: built.storeIdSet,
          })
        : null

    const errors: TimeSlotBundle['errors'] = {}
    if (currentError) errors.current = currentError
    if (comparisonError) errors.comparison = comparisonError

    return {
      currentSeries,
      comparisonSeries,
      meta: {
        usedFallback: false,
        provenance: built.provenance,
      },
      isLoading: currentLoading || comparisonLoading,
      errors,
      error: currentError ?? comparisonError ?? null,
    }
  }, [
    frame,
    built,
    currentOutput,
    comparisonOutput,
    currentLoading,
    comparisonLoading,
    currentError,
    comparisonError,
  ])
}
