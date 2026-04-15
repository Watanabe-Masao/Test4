/**
 * projectTimeSlotSeries — pure projection from raw rows to TimeSlotSeries
 *
 * unify-period-analysis Phase 6 Step C:
 * `StoreAggregationRow[]` (時刻×店舗 raw rows、infra から返る) を
 * `TimeSlotSeries` (presentation 消費可) に変換する **pure 関数**。
 *
 * Step C 実装の唯一の意味境界。本関数の真理値表 (parity test) で
 * 「row → series 変換の意味」を凍結し、後続の `useTimeSlotBundle` hook 実装は
 * 「方針を実装する作業」だけに集中できる。
 *
 * ## 責務 (本関数で行うこと)
 *
 *   - storeIds subset でフィルタする
 *   - storeId × hour で集約する (同一 cell に複数 row があれば合計)
 *   - 24 長の `byHour` 配列を作る (index = hour 0-23)
 *   - 欠損 hour は `null` で表す (0 ではない — 「データなし」と「ゼロ円」の区別)
 *   - 各店舗の `total` を計算 (null は除外して合計)
 *   - storeId 順で安定ソート
 *   - `grandTotal` / `dayCount` を埋める
 *
 * ## 非責務 (本関数で行わないこと)
 *
 *   - DuckDB / query: caller (handler / hook) の責務
 *   - alignmentMode 解決 / 比較期間決定: ComparisonScope の責務
 *   - meta.usedFallback / provenance: bundle hook が組み立てる
 *   - React: 完全に pure
 *
 * ## hour の扱い
 *
 *   - 0-23 範囲外の row は **silently 無視** (defensive: infra schema 違反は
 *     Zod parse で落ちる前提だが、念のため)
 *   - 同じ (storeId, hour) の row が複数あれば加算する
 *
 * @see TimeSlotBundle.types.ts
 * @see projects/unify-period-analysis/step-c-timeslot-lane-policy.md
 *
 * @responsibility R:transform
 */
import type { StoreAggregationRow } from '@/application/hooks/duckdb'
import type { TimeSlotSeries, TimeSlotStoreEntry } from './TimeSlotBundle.types'

const HOURS_PER_DAY = 24

export interface ProjectTimeSlotSeriesOptions {
  /** 対象期間の日数 (TimeSlotSeries.dayCount に焼く) */
  readonly dayCount: number
  /**
   * 集計対象に絞る storeId の集合。
   * - undefined / 空 set → row に含まれる全 storeId を採用
   * - 非空 set → 指定外の storeId は除外
   */
  readonly storeIds?: ReadonlySet<string>
}

/**
 * Empty series. caller が「比較なし」を表現するために使う。
 */
export const EMPTY_TIME_SLOT_SERIES: TimeSlotSeries = {
  entries: [],
  grandTotal: 0,
  dayCount: 0,
}

/**
 * `StoreAggregationRow[]` → `TimeSlotSeries` の pure projection。
 */
export function projectTimeSlotSeries(
  rows: readonly StoreAggregationRow[],
  options: ProjectTimeSlotSeriesOptions,
): TimeSlotSeries {
  const wantStores = options.storeIds && options.storeIds.size > 0 ? options.storeIds : null

  // Group by storeId, accumulate per hour
  const byStore = new Map<string, (number | null)[]>()
  for (const row of rows) {
    if (wantStores && !wantStores.has(row.storeId)) continue
    if (!Number.isInteger(row.hour) || row.hour < 0 || row.hour >= HOURS_PER_DAY) continue
    let arr = byStore.get(row.storeId)
    if (!arr) {
      arr = new Array<number | null>(HOURS_PER_DAY).fill(null)
      byStore.set(row.storeId, arr)
    }
    const prev = arr[row.hour]
    arr[row.hour] = (prev ?? 0) + row.amount
  }

  // Build entries sorted by storeId for stable ordering
  const entries: TimeSlotStoreEntry[] = [...byStore.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([storeId, byHour]) => {
      let total = 0
      for (const v of byHour) {
        if (v != null) total += v
      }
      return { storeId, byHour, total }
    })

  let grandTotal = 0
  for (const e of entries) grandTotal += e.total

  return {
    entries,
    grandTotal,
    dayCount: options.dayCount,
  }
}
