/**
 * useStoreDailyBundle — 店舗別日次レーンの統合入口
 *
 * unify-period-analysis Phase 6.5 Step B (Phase 6.5-4):
 * `StoreDailyFrame` を入力に、`storeDaySummaryPairHandler` (lane 非依存の
 * paired handler、INV-RUN-02 Comparison Integrity 準拠) を呼び出して raw
 * rows の current/comparison pair を取得し、`projectStoreDailySeries` で
 * `StoreDailySeries` に変換した `StoreDailyBundle` を返す。Step C の
 * `useTimeSlotBundle` と同形の sibling pattern。
 *
 * ## 構造
 *
 * ```
 * StoreDailyFrame (dateRange + storeIds + comparison)
 *   ↓ buildInput
 * StoreDaySummaryPairInput (dateFrom/To + comparisonDateFrom/To)
 *   ↓ useQueryWithHandler(storeDaySummaryPairHandler)
 * { current: StoreDaySummaryOutput, comparison: StoreDaySummaryOutput | null }
 *   ↓ projectStoreDailySeries × 2 (pure)
 * { currentSeries, comparisonSeries }
 *   ↓ StoreDailyBundle
 * ```
 *
 * ## paired handler 採用の理由
 *
 * - Guard `AR-STRUCT-QUERY-PATTERN` (INV-RUN-02) が base handler 直接
 *   import を禁止し、pair 化済み handler の利用を強制する
 * - Promise.all で current + comparison を並列実行し latency を最小化
 * - `isPrevYear` フラグは `createPairedHandler` が自動設定するため
 *   caller 側で指定不要
 *
 * ## 比較期間
 *
 * `frame.comparison` が存在する場合、pair input に
 * `comparisonDateFrom/To` を追加する。handler 側で両期間を取得し、
 * 返り値の `comparison` が null でなければ projection する。
 *
 * ## widget 非依存性
 *
 * 本 hook は `SalesPurchaseComparisonChart` に依存せず、lane 独立の sibling
 * として機能する (設計書 §2)。特定 widget の plan hook を再利用しない。
 *
 * @see StoreDailyBundle.types.ts
 * @see projectStoreDailySeries.ts
 * @see app/src/application/hooks/timeSlot/useTimeSlotBundle.ts (参照実装)
 * @see app/src/application/queries/summary/StoreDaySummaryPairHandler.ts
 *
 * @responsibility R:orchestration
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { CalendarDate } from '@/domain/models/CalendarDate'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import { storeDaySummaryPairHandler } from '@/application/queries/summary/StoreDaySummaryPairHandler'
import type { StoreDaySummaryInput } from '@/application/queries/summary/StoreDaySummaryHandler'
import type { PairedInput } from '@/application/queries/createPairedHandler'
import { projectStoreDailySeries } from './projectStoreDailySeries'
import type {
  StoreDailyBundle,
  StoreDailyFrame,
  StoreDailyMeta,
  StoreDailyProvenance,
} from './StoreDailyBundle.types'

function noProvenance(): StoreDailyProvenance {
  return { mappingKind: 'none', comparisonRange: null }
}

function defaultMeta(): StoreDailyMeta {
  return { usedFallback: false, provenance: noProvenance() }
}

function frameAbsentBundle(): StoreDailyBundle {
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

/**
 * Step C `useTimeSlotBundle` と同じ exhaustive switch による mappingKind 決定。
 * 将来 `ComparisonScope.alignmentMode` に値が追加されたとき compile-time で
 * 検出する。
 */
function resolveMappingKind(
  alignmentMode: 'sameDate' | 'sameDayOfWeek',
): StoreDailyProvenance['mappingKind'] {
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

type StoreDaySummaryPairInput = PairedInput<StoreDaySummaryInput>

interface BuiltInput {
  readonly paired: StoreDaySummaryPairInput | null
  readonly currentDayCount: number
  readonly comparisonDayCount: number
  readonly storeIdSet: ReadonlySet<string>
  readonly provenance: StoreDailyProvenance
}

function buildInput(frame: StoreDailyFrame | null): BuiltInput {
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

  const base: StoreDaySummaryPairInput = {
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
  const paired: StoreDaySummaryPairInput = {
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

export function useStoreDailyBundle(
  executor: QueryExecutor | null,
  frame: StoreDailyFrame | null,
): StoreDailyBundle {
  const built = useMemo(() => buildInput(frame), [frame])

  const { data, isLoading, error } = useQueryWithHandler(
    executor,
    storeDaySummaryPairHandler,
    built.paired,
  )

  return useMemo<StoreDailyBundle>(() => {
    if (!frame) return frameAbsentBundle()

    const currentSeries = data?.current
      ? projectStoreDailySeries(data.current.records, {
          dayCount: built.currentDayCount,
          storeIds: built.storeIdSet,
        })
      : null

    const comparisonSeries = data?.comparison
      ? projectStoreDailySeries(data.comparison.records, {
          dayCount: built.comparisonDayCount,
          storeIds: built.storeIdSet,
        })
      : null

    const errors: StoreDailyBundle['errors'] = {}
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
