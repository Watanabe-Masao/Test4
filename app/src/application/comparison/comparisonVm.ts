/**
 * Chart VM 変換 — ResolvedComparisonRow[] を既存 YoyDailyRow 互換 shape に変換
 *
 * 既存チャートコンポーネント（YoYChart 等）が YoyDailyRow を期待するため、
 * 移行期間中の互換性を維持する Chart VM 変換層。
 *
 * YoyDailyRowVm は YoyDailyRow と同一フィールド + matchStatus。
 * infrastructure 層への依存を避けるため、YoyDailyRow を直接 import せず、
 * 同一 shape を application 層内で独立定義する。
 */
import type { MatchStatus, ResolvedComparisonRow } from './comparisonTypes'

/**
 * YoyDailyRow 互換 + matchStatus
 *
 * infrastructure/duckdb/queries/yoyComparison.YoyDailyRow と同一フィールドを持つ。
 * application → infrastructure の依存を避けるため独立定義。
 * 既存チャートは matchStatus を無視しても動作する。
 */
export interface YoyDailyRowVm {
  readonly curDateKey: string | null
  readonly prevDateKey: string | null
  readonly storeId: string
  readonly curSales: number
  readonly prevSales: number | null
  readonly salesDiff: number
  readonly curCustomers: number
  readonly prevCustomers: number | null
  readonly matchStatus: MatchStatus
}

/**
 * ResolvedComparisonRow[] を YoyDailyRowVm[] に変換する。
 *
 * 入力順を保持する。
 */
export function toYoyDailyRowVm(rows: readonly ResolvedComparisonRow[]): YoyDailyRowVm[] {
  return rows.map((r) => ({
    curDateKey: r.currentDateKey,
    prevDateKey: r.compareDateKey,
    storeId: r.storeId,
    curSales: r.currentSales ?? 0,
    prevSales: r.compareSales,
    salesDiff: (r.currentSales ?? 0) - (r.compareSales ?? 0),
    curCustomers: r.currentCustomers ?? 0,
    prevCustomers: r.compareCustomers,
    matchStatus: r.status,
  }))
}
