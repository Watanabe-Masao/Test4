/**
 * 分類別時間帯売上のチャート用フック群
 *
 * チャートコンポーネントは生レコード (CategoryTimeSalesRecord[]) を直接操作せず、
 * これらのフックを通じてチャート描画に必要なデータを取得する。
 *
 * ## 設計原則
 *
 * 1. チャートは CtsIndex, queryByDateRange, aggregation 関数を直接知らない
 * 2. フックが DateRange → クエリ → 集約 → 除数適用 を一括で行う
 * 3. レコードの year/month/day は常に保持され、曜日計算もレコード自身の日付を使う
 * 4. 前年比較は compareRange パラメータで自然に表現する
 *
 * ## 使い方
 *
 * ```tsx
 * // チャートコンポーネント内
 * const data = useTimeSlotChartData({
 *   index: ctx.ctsIndex,
 *   dateRange: ctx.currentDateRange,  // { from: { year: 2026, month: 2, day: 1 }, to: ... }
 *   storeIds: ctx.selectedStoreIds,
 *   mode: 'dailyAvg',
 *   compareRange: ctx.prevYearDateRange,
 * })
 * // data.current.hourly → Map<hour, { amount, quantity }>
 * // data.compare?.hourly → 前年データ
 * // DateKey は 'YYYY-MM-DD' 形式（例: '2026-02-03'）
 * ```
 */
import { useMemo } from 'react'
import type { CategoryTimeSalesIndex, DateRange } from '@/domain/models'
import {
  queryByDateRange,
  aggregateHourly,
  aggregateByLevel,
  aggregateHourDow,
  aggregateByStore,
  computeDivisor,
  countDistinctDays,
} from '@/application/usecases'
import type {
  HierarchyFilterParams,
  AggregateMode,
  LevelAggregationEntry,
  HourDowAggregation,
  StoreHourlyEntry,
} from '@/application/usecases'

// ── 共通パラメータ ────────────────────────────────────────

/** チャートフックの基本パラメータ */
interface BaseCtsParams {
  /** 分類別時間帯売上インデックス */
  readonly index: CategoryTimeSalesIndex
  /** 対象日付範囲 */
  readonly dateRange: DateRange
  /** 選択中の店舗ID（空 = 全店） */
  readonly storeIds: ReadonlySet<string>
  /** 階層フィルタ（省略時は全カテゴリ） */
  readonly hierarchy?: HierarchyFilterParams
  /** 曜日フィルタ (0=日〜6=土)。省略時は全曜日 */
  readonly dow?: ReadonlySet<number>
}

// ── 時間帯別集約フック ──────────────────────────────────────

/** useTimeSlotChartData の戻り値 */
export interface TimeSlotChartResult {
  /** 当期間の時間帯別データ（除数適用済み） */
  readonly current: {
    readonly hourly: ReadonlyMap<number, { readonly amount: number; readonly quantity: number }>
    readonly totalAmount: number
    readonly totalQuantity: number
    readonly recordCount: number
    readonly divisor: number
  }
  /** 比較期間の時間帯別データ（除数適用済み、compareRange 未指定時は undefined） */
  readonly compare?: {
    readonly hourly: ReadonlyMap<number, { readonly amount: number; readonly quantity: number }>
    readonly totalAmount: number
    readonly totalQuantity: number
    readonly recordCount: number
    readonly divisor: number
  }
}

/**
 * 時間帯別集約データを返すフック。
 *
 * 棒グラフ・折れ線グラフ用。前年比較データも同時に取得可能。
 */
export function useTimeSlotChartData(
  params: BaseCtsParams & {
    readonly mode: AggregateMode
    /** 比較期間（前年等） */
    readonly compareRange?: DateRange
  },
): TimeSlotChartResult {
  const { index, dateRange, storeIds, hierarchy, dow, mode, compareRange } = params

  const currentRecords = useMemo(
    () => queryByDateRange(index, { dateRange, storeIds, hierarchy, dow }),
    [index, dateRange, storeIds, hierarchy, dow],
  )

  const currentAgg = useMemo(
    () => aggregateHourly(currentRecords),
    [currentRecords],
  )

  const currentDistinctDays = useMemo(
    () => countDistinctDays(currentRecords),
    [currentRecords],
  )

  const current = useMemo(() => {
    const divisor = computeDivisor(currentDistinctDays, mode)
    const divided = new Map<number, { amount: number; quantity: number }>()
    for (const [h, v] of currentAgg.hourly) {
      divided.set(h, {
        amount: Math.round(v.amount / divisor),
        quantity: Math.round(v.quantity / divisor),
      })
    }
    return {
      hourly: divided,
      totalAmount: currentAgg.totalAmount,
      totalQuantity: currentAgg.totalQuantity,
      recordCount: currentAgg.recordCount,
      divisor,
    }
  }, [currentAgg, currentDistinctDays, mode])

  const compareRecords = useMemo(
    () => compareRange
      ? queryByDateRange(index, { dateRange: compareRange, storeIds, hierarchy, dow })
      : undefined,
    [index, compareRange, storeIds, hierarchy, dow],
  )

  const compare = useMemo(() => {
    if (!compareRecords) return undefined
    const agg = aggregateHourly(compareRecords)
    const distinctDays = countDistinctDays(compareRecords)
    const divisor = computeDivisor(distinctDays, mode)
    const divided = new Map<number, { amount: number; quantity: number }>()
    for (const [h, v] of agg.hourly) {
      divided.set(h, {
        amount: Math.round(v.amount / divisor),
        quantity: Math.round(v.quantity / divisor),
      })
    }
    return {
      hourly: divided,
      totalAmount: agg.totalAmount,
      totalQuantity: agg.totalQuantity,
      recordCount: agg.recordCount,
      divisor,
    }
  }, [compareRecords, mode])

  return { current, compare }
}

// ── カテゴリ階層別集約フック ─────────────────────────────────

/** useCategoryBreakdownData の戻り値 */
export interface CategoryBreakdownResult {
  /** 当期間のカテゴリ別集約 */
  readonly current: ReadonlyMap<string, LevelAggregationEntry>
  /** 比較期間のカテゴリ別集約（compareRange 未指定時は undefined） */
  readonly compare?: ReadonlyMap<string, LevelAggregationEntry>
  /** 当期間のレコード数 */
  readonly recordCount: number
  /** 当期間の除数 */
  readonly divisor: number
}

/**
 * カテゴリ階層別の集約データを返すフック。
 *
 * CategoryHierarchyExplorer、CategoryDrilldown 用。
 */
export function useCategoryBreakdownData(
  params: BaseCtsParams & {
    readonly level: 'department' | 'line' | 'klass'
    readonly mode: AggregateMode
    readonly compareRange?: DateRange
  },
): CategoryBreakdownResult {
  const { index, dateRange, storeIds, hierarchy, dow, level, mode, compareRange } = params

  const currentRecords = useMemo(
    () => queryByDateRange(index, { dateRange, storeIds, hierarchy, dow }),
    [index, dateRange, storeIds, hierarchy, dow],
  )

  const current = useMemo(
    () => aggregateByLevel(currentRecords, level),
    [currentRecords, level],
  )

  const distinctDays = useMemo(
    () => countDistinctDays(currentRecords),
    [currentRecords],
  )

  const divisor = useMemo(
    () => computeDivisor(distinctDays, mode),
    [distinctDays, mode],
  )

  const compare = useMemo(() => {
    if (!compareRange) return undefined
    const recs = queryByDateRange(index, { dateRange: compareRange, storeIds, hierarchy, dow })
    return aggregateByLevel(recs, level)
  }, [index, compareRange, storeIds, hierarchy, dow, level])

  return {
    current,
    compare,
    recordCount: currentRecords.length,
    divisor,
  }
}

// ── 時間帯×曜日ヒートマップフック ────────────────────────────

/** useHeatmapChartData の戻り値 */
export interface HeatmapChartResult {
  /** hour × dow の集約データ */
  readonly aggregation: HourDowAggregation
  /** 比較データ（compareRange 指定時） */
  readonly compareAggregation?: HourDowAggregation
  /** レコード数 */
  readonly recordCount: number
}

/**
 * 時間帯×曜日ヒートマップ用の集約データを返すフック。
 */
export function useHeatmapChartData(
  params: BaseCtsParams & {
    readonly year: number
    readonly month: number
    readonly compareRange?: DateRange
    readonly compareYear?: number
    readonly compareMonth?: number
  },
): HeatmapChartResult {
  const { index, dateRange, storeIds, hierarchy, dow, year, month, compareRange, compareYear, compareMonth } = params

  const records = useMemo(
    () => queryByDateRange(index, { dateRange, storeIds, hierarchy, dow }),
    [index, dateRange, storeIds, hierarchy, dow],
  )

  const aggregation = useMemo(
    () => aggregateHourDow(records, year, month),
    [records, year, month],
  )

  const compareAggregation = useMemo(() => {
    if (!compareRange) return undefined
    const recs = queryByDateRange(index, { dateRange: compareRange, storeIds, hierarchy, dow })
    return aggregateHourDow(recs, compareYear ?? year - 1, compareMonth ?? month)
  }, [index, compareRange, storeIds, hierarchy, dow, compareYear, compareMonth, year, month])

  return {
    aggregation,
    compareAggregation,
    recordCount: records.length,
  }
}

// ── 店舗比較フック ────────────────────────────────────────

/** useStoreComparisonData の戻り値 */
export interface StoreComparisonResult {
  /** 店舗別の時間帯集約 */
  readonly stores: ReadonlyMap<string, StoreHourlyEntry>
  /** レコード数 */
  readonly recordCount: number
}

/**
 * 店舗間比較チャート用の集約データを返すフック。
 */
export function useStoreComparisonData(
  params: Omit<BaseCtsParams, 'storeIds'>,
): StoreComparisonResult {
  const { index, dateRange, hierarchy, dow } = params

  const records = useMemo(
    () => queryByDateRange(index, { dateRange, hierarchy, dow }),
    [index, dateRange, hierarchy, dow],
  )

  const stores = useMemo(
    () => aggregateByStore(records),
    [records],
  )

  return { stores, recordCount: records.length }
}

// ── 生レコード取得フック（日別詳細等） ─────────────────────────

/** useCtsRecords の戻り値 */
export interface CtsRecordsResult {
  /** フィルタ済みレコード */
  readonly records: readonly import('@/domain/models').CategoryTimeSalesRecord[]
  /** レコード数 */
  readonly recordCount: number
  /** distinct day 数 */
  readonly distinctDays: number
}

/**
 * フィルタ済みレコードを取得するフック。
 *
 * 他のフックで対応しきれない特殊なチャート（MonthlyCalendar の日別詳細モーダル等）用。
 * このフックの戻り値からは生レコードにアクセスできるが、チャートは
 * ここから再度 filter/reduce を行うべきではない。
 */
export function useCtsRecords(params: BaseCtsParams): CtsRecordsResult {
  const { index, dateRange, storeIds, hierarchy, dow } = params

  const records = useMemo(
    () => queryByDateRange(index, { dateRange, storeIds, hierarchy, dow }),
    [index, dateRange, storeIds, hierarchy, dow],
  )

  const distinctDays = useMemo(
    () => countDistinctDays(records),
    [records],
  )

  return { records, recordCount: records.length, distinctDays }
}
