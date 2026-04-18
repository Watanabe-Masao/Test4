/**
 * useCategoryLeafDailyBundle — カテゴリ leaf-grain 日次比較レーンの統合入口
 *
 * category-leaf-daily-series project で新設。
 * `CategoryLeafDailyFrame` を入力に、`categoryTimeRecordsPairHandler` で current +
 * comparison を並列取得し、`projectCategoryLeafDailySeries` で projection した
 * `CategoryLeafDailyBundle` を返す。
 *
 * ## フォールバック意味論
 *
 * 旧 `selectCtsWithFallbackFromPair` の「prev 空 → current scope の同日付で救済」を
 * bundle 内部に畳み込む:
 *
 * 1. `comparisonDateFrom/To` を指定した pair 呼び出しで (current, comparison) を取得
 * 2. comparison が空（entries 0 件）なら、同日付レンジで `isPrevYear=false` のクエリ
 *    （`comparisonFallback` 呼び出し）を実行し、そちらの結果を comparisonSeries に
 *    採用
 * 3. fallback が発火したときは `meta.provenance.usedComparisonFallback = true`
 *
 * ## 責務
 *
 * - 1) frame を pair input + fallback input に変換
 * - 2) pair handler を呼ぶ（current + comparison を 1 回で）
 * - 3) comparison が空なら comparisonFallback handler を呼ぶ
 * - 4) projection + provenance 組み立て
 *
 * ## 非責務
 *
 * - alignment 解決（frame.comparison が既に解決済み）
 * - presentation 消費方法（caller が bundle.currentSeries / comparisonSeries を読む）
 *
 * @see CategoryLeafDailyBundle.types.ts
 * @see projects/category-leaf-daily-series/HANDOFF.md
 *
 * @responsibility R:orchestration
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { CalendarDate, DateRange } from '@/domain/models/CalendarDate'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { categoryTimeRecordsHandler } from '@/application/queries/cts/CategoryTimeRecordsHandler'
import { categoryTimeRecordsPairHandler } from '@/application/queries/cts/CategoryTimeRecordsPairHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'
import type { CategoryTimeRecordsInput } from '@/application/queries/cts/CategoryTimeRecordsHandler'
import { projectCategoryLeafDailySeries } from './projectCategoryLeafDailySeries'
import type {
  CategoryLeafDailyFrame,
  CategoryLeafDailyBundle,
  CategoryLeafDailyMeta,
  CategoryLeafDailyProvenance,
  CategoryLeafDailySeries,
} from './CategoryLeafDailyBundle.types'
import { EMPTY_CATEGORY_LEAF_DAILY_SERIES } from './CategoryLeafDailyBundle.types'

function dateToISO(d: CalendarDate): string {
  const m = String(d.month).padStart(2, '0')
  const day = String(d.day).padStart(2, '0')
  return `${d.year}-${m}-${day}`
}

function dateRangeToISO(r: DateRange): { from: string; to: string } {
  return { from: dateToISO(r.from), to: dateToISO(r.to) }
}

function dayCount(from: CalendarDate, to: CalendarDate): number {
  const a = new Date(from.year, from.month - 1, from.day).getTime()
  const b = new Date(to.year, to.month - 1, to.day).getTime()
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1)
}

function noProvenance(): CategoryLeafDailyProvenance {
  return { mappingKind: 'none', comparisonRange: null, usedComparisonFallback: false }
}

function defaultMeta(): CategoryLeafDailyMeta {
  return { usedFallback: false, provenance: noProvenance() }
}

function absentBundle(): CategoryLeafDailyBundle {
  return {
    currentSeries: null,
    comparisonSeries: null,
    meta: defaultMeta(),
    isLoading: false,
    errors: {},
    error: null,
  }
}

function resolveMappingKind(
  mode: 'sameDate' | 'sameDayOfWeek',
): CategoryLeafDailyProvenance['mappingKind'] {
  switch (mode) {
    case 'sameDate':
      return 'sameDate'
    case 'sameDayOfWeek':
      return 'sameDayOfWeek'
    default: {
      const _exhaustive: never = mode
      return _exhaustive
    }
  }
}

interface BuiltInputs {
  readonly pairInput: PairedInput<CategoryTimeRecordsInput> | null
  readonly fallbackInput: CategoryTimeRecordsInput | null
  readonly currentDayCount: number
  readonly comparisonDayCount: number
  readonly provenanceBase: Omit<CategoryLeafDailyProvenance, 'usedComparisonFallback'>
}

function buildInputs(frame: CategoryLeafDailyFrame | null): BuiltInputs {
  if (!frame) {
    return {
      pairInput: null,
      fallbackInput: null,
      currentDayCount: 0,
      comparisonDayCount: 0,
      provenanceBase: { mappingKind: 'none', comparisonRange: null },
    }
  }
  const sortedStoreIds = [...frame.storeIds].sort()
  const storeIds = sortedStoreIds.length > 0 ? sortedStoreIds : undefined
  const curIso = dateRangeToISO(frame.dateRange)
  const currentDayCount = dayCount(frame.dateRange.from, frame.dateRange.to)

  if (!frame.comparison) {
    return {
      pairInput: {
        dateFrom: curIso.from,
        dateTo: curIso.to,
        storeIds,
      },
      fallbackInput: null,
      currentDayCount,
      comparisonDayCount: 0,
      provenanceBase: { mappingKind: 'none', comparisonRange: null },
    }
  }

  const cmpIso = dateRangeToISO(frame.comparison.effectivePeriod2)
  const comparisonDayCount = dayCount(
    frame.comparison.effectivePeriod2.from,
    frame.comparison.effectivePeriod2.to,
  )

  return {
    pairInput: {
      dateFrom: curIso.from,
      dateTo: curIso.to,
      storeIds,
      comparisonDateFrom: cmpIso.from,
      comparisonDateTo: cmpIso.to,
    },
    fallbackInput: {
      dateFrom: cmpIso.from,
      dateTo: cmpIso.to,
      storeIds,
    },
    currentDayCount,
    comparisonDayCount,
    provenanceBase: {
      mappingKind: resolveMappingKind(frame.comparison.alignmentMode),
      comparisonRange: cmpIso,
    },
  }
}

export function useCategoryLeafDailyBundle(
  executor: QueryExecutor | null,
  frame: CategoryLeafDailyFrame | null,
): CategoryLeafDailyBundle {
  const built = useMemo(() => buildInputs(frame), [frame])

  const pairResult = useQueryWithHandler(executor, categoryTimeRecordsPairHandler, built.pairInput)
  const fallbackResult = useQueryWithHandler(
    executor,
    categoryTimeRecordsHandler,
    built.fallbackInput,
  )

  return useMemo<CategoryLeafDailyBundle>(() => {
    if (!frame) return absentBundle()

    const currentRecords = pairResult.data?.current?.records ?? []
    const comparisonPrimary = pairResult.data?.comparison?.records ?? []
    const comparisonFallback = fallbackResult.data?.records ?? []

    const usedComparisonFallback =
      built.fallbackInput != null && comparisonPrimary.length === 0 && comparisonFallback.length > 0
    const effectiveComparisonRecords = usedComparisonFallback
      ? comparisonFallback
      : comparisonPrimary

    const currentSeries: CategoryLeafDailySeries | null = pairResult.data
      ? projectCategoryLeafDailySeries(currentRecords, { dayCount: built.currentDayCount })
      : null

    const comparisonSeries: CategoryLeafDailySeries | null = built.fallbackInput
      ? pairResult.data || fallbackResult.data
        ? projectCategoryLeafDailySeries(effectiveComparisonRecords, {
            dayCount: built.comparisonDayCount,
          })
        : null
      : null

    const errors: CategoryLeafDailyBundle['errors'] = {}
    if (pairResult.error) errors.current = pairResult.error
    if (pairResult.error) errors.comparison = pairResult.error
    if (fallbackResult.error) errors.comparisonFallback = fallbackResult.error

    const isLoading = pairResult.isLoading || fallbackResult.isLoading
    const error = pairResult.error ?? fallbackResult.error ?? null

    return {
      currentSeries: currentSeries ?? EMPTY_CATEGORY_LEAF_DAILY_SERIES,
      comparisonSeries,
      meta: {
        usedFallback: usedComparisonFallback,
        provenance: {
          ...built.provenanceBase,
          usedComparisonFallback,
        },
      },
      isLoading,
      errors,
      error,
    }
  }, [frame, built, pairResult, fallbackResult])
}
