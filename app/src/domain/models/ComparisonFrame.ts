/**
 * ComparisonFrame — 後方互換 re-export
 *
 * ComparisonFrame は ComparisonScope に統合された。
 * このファイルは既存の import パスを維持するための re-export。
 * 新規コードでは ComparisonScope を直接使用すること。
 *
 * 削除予定: 全消費者が ComparisonScope に移行後
 */
import type { DateRange } from './CalendarDate'
import type { AlignmentMode } from './ComparisonScope'

/** @deprecated AlignmentMode を使用すること */
export type AlignmentPolicy = AlignmentMode

/** @deprecated ComparisonScope を使用すること */
export interface ComparisonFrame {
  readonly current: DateRange
  readonly previous: DateRange
  readonly dowOffset: number
  readonly policy: AlignmentPolicy
}

// PrevYearScope は ComparisonScope.ts に移動済み — 後方互換 re-export
export type { PrevYearScope } from './ComparisonScope'
