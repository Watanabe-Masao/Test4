/**
 * useCategoryDailyBundle — 部門×日次レーンの統合入口
 *
 * unify-period-analysis Phase 6.5 Step B (Phase 6.5-4):
 * `CategoryDailyFrame` を入力に、`categoryTimeRecordsPairHandler` (lane
 * 非依存の汎用 paired handler、INV-RUN-02 Comparison Integrity 準拠) を
 * 呼び出して `CategoryTimeSalesRecord[]` の current/comparison pair を取得し、
 * `projectCategoryDailySeries` で `CategoryDailySeries` に変換した
 * `CategoryDailyBundle` を返す。
 *
 * Step C の `useTimeSlotBundle` / Phase 6.5-4 の `useStoreDailyBundle` と
 * 同形の sibling pattern。
 *
 * ## widget 非依存性 (重要)
 *
 * 本 hook は `useYoYWaterfallPlan` 等の widget 専用 plan を **再利用しない**。
 * 設計書 §2 で lane は widget 非依存の sibling として定義されており、
 * widget 専用実装に引っ張られないよう、lane 独立の
 * `categoryTimeRecordsPairHandler` を直接束ねる。widget 載せ替え
 * (Phase 6.5-5) 時、YoYWaterfallChart は `ctx.categoryDailyLane.bundle`
 * を消費するだけで済む。
 *
 * ## 構造
 *
 * ```
 * CategoryDailyFrame (dateRange + storeIds + comparison)
 *   ↓ buildInput
 * CategoryTimeRecordsPairInput (dateFrom/To + comparisonDateFrom/To)
 *   ↓ useQueryWithHandler(categoryTimeRecordsPairHandler)
 * { current: CategoryTimeRecordsOutput, comparison: CategoryTimeRecordsOutput | null }
 *   ↓ projectCategoryDailySeries × 2 (pure)
 * { currentSeries, comparisonSeries }
 *   ↓ CategoryDailyBundle
 * ```
 *
 * @see CategoryDailyBundle.types.ts
 * @see projectCategoryDailySeries.ts
 * @see app/src/application/hooks/storeDaily/useStoreDailyBundle.ts (sibling)
 * @see app/src/application/hooks/timeSlot/useTimeSlotBundle.ts (参照実装)
 * @see app/src/application/queries/cts/CategoryTimeRecordsPairHandler.ts
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { CalendarDate } from '@/domain/models/CalendarDate'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { categoryTimeRecordsPairHandler } from '@/application/queries/cts/CategoryTimeRecordsPairHandler'
import type { CategoryTimeRecordsInput } from '@/application/queries/cts/CategoryTimeRecordsHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'
import { projectCategoryDailySeries } from './projectCategoryDailySeries'
import type {
  CategoryDailyBundle,
  CategoryDailyFrame,
  CategoryDailyMeta,
  CategoryDailyProvenance,
} from './CategoryDailyBundle.types'

function noProvenance(): CategoryDailyProvenance {
  return { mappingKind: 'none', comparisonRange: null }
}

function defaultMeta(): CategoryDailyMeta {
  return { usedFallback: false, provenance: noProvenance() }
}

function frameAbsentBundle(): CategoryDailyBundle {
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

function resolveMappingKind(
  alignmentMode: 'sameDate' | 'sameDayOfWeek',
): CategoryDailyProvenance['mappingKind'] {
  switch (alignmentMode) {
    case 'sameDate':
      return 'sameDate'
    case 'sameDayOfWeek':
      return 'sameDayOfWeek'
    default: {
      const _exhaustive: never = alignmentMode
      return _exhaustive
    }
  }
}

type CategoryTimeRecordsPairInput = PairedInput<CategoryTimeRecordsInput>

interface BuiltInput {
  readonly paired: CategoryTimeRecordsPairInput | null
  readonly currentDayCount: number
  readonly comparisonDayCount: number
  readonly storeIdSet: ReadonlySet<string>
  readonly provenance: CategoryDailyProvenance
}

function buildInput(frame: CategoryDailyFrame | null): BuiltInput {
  if (!frame) {
    return {
      paired: null,
      currentDayCount: 0,
      comparisonDayCount: 0,
      storeIdSet: new Set(),
      provenance: noProvenance(),
    }
  }
  const sortedStoreIds = [...frame.storeIds].sort()
  const storeIdSet = new Set(sortedStoreIds)
  const currentDayCount = dayCount(frame.dateRange.from, frame.dateRange.to)

  const base: CategoryTimeRecordsPairInput = {
    dateFrom: dateToISO(frame.dateRange.from),
    dateTo: dateToISO(frame.dateRange.to),
    storeIds: sortedStoreIds.length > 0 ? sortedStoreIds : undefined,
  }

  if (!frame.comparison) {
    return {
      paired: base,
      currentDayCount,
      comparisonDayCount: 0,
      storeIdSet,
      provenance: noProvenance(),
    }
  }

  const cmpRange = frame.comparison.effectivePeriod2
  const comparisonDateFrom = dateToISO(cmpRange.from)
  const comparisonDateTo = dateToISO(cmpRange.to)
  const paired: CategoryTimeRecordsPairInput = {
    ...base,
    comparisonDateFrom,
    comparisonDateTo,
  }
  const comparisonDayCount = dayCount(cmpRange.from, cmpRange.to)
  const mappingKind = resolveMappingKind(frame.comparison.alignmentMode)

  return {
    paired,
    currentDayCount,
    comparisonDayCount,
    storeIdSet,
    provenance: {
      mappingKind,
      comparisonRange: { from: comparisonDateFrom, to: comparisonDateTo },
    },
  }
}

export function useCategoryDailyBundle(
  executor: QueryExecutor | null,
  frame: CategoryDailyFrame | null,
): CategoryDailyBundle {
  const built = useMemo(() => buildInput(frame), [frame])

  const { data, isLoading, error } = useQueryWithHandler(
    executor,
    categoryTimeRecordsPairHandler,
    built.paired,
  )

  return useMemo<CategoryDailyBundle>(() => {
    if (!frame) return frameAbsentBundle()

    const currentSeries = data?.current
      ? projectCategoryDailySeries(data.current.records, {
          dayCount: built.currentDayCount,
          storeIds: built.storeIdSet,
        })
      : null

    const comparisonSeries = data?.comparison
      ? projectCategoryDailySeries(data.comparison.records, {
          dayCount: built.comparisonDayCount,
          storeIds: built.storeIdSet,
        })
      : null

    const errors: CategoryDailyBundle['errors'] = {}
    if (error) errors.current = error

    return {
      currentSeries,
      comparisonSeries,
      meta: {
        usedFallback: false,
        provenance: built.provenance,
      },
      isLoading,
      errors,
      error: error ?? null,
    }
  }, [frame, built, data, isLoading, error])
}
