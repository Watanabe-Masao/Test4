/**
 * DualPeriodPicker — pure helper functions
 *
 * component 内で inline されていた CalendarDate ↔ Date 変換と
 * preset 生成 / preset 検索ロジックを切り出す。
 *
 * 方針: 描画 component は pure 関数を組み合わせるだけ（C1 / F7 準拠）。
 *
 * @responsibility R:utility
 */
import type { DateRange as AppDateRange } from '@/domain/models/calendar'
import { toDateKey } from '@/domain/models/calendar'

// ── CalendarDate ↔ Date 変換 ────────────────────────────

/**
 * AppDateRange の from/to から JS Date に変換する。
 * month は 0-index ずれる点に注意（month=3 → new Date(y, 2, d)）。
 */
export function toJsDate(d: AppDateRange['from']): Date {
  return new Date(d.year, d.month - 1, d.day)
}

/**
 * JS Date から AppDateRange の境界値（from/to の共通型）に変換する。
 * getMonth() は 0-index なので +1 して 1-index 化する。
 */
export function fromJsDate(d: Date): AppDateRange['from'] {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
}

// ── Period1 Presets ─────────────────────────────────────

/** Period1 の期間プリセット1件 */
export interface P1Preset {
  readonly label: string
  readonly key: string
  readonly range: AppDateRange
}

/**
 * 期間1のプリセットを構築する（月全日 / 上旬 / 中旬 / 下旬）。
 *
 * - 月全日: 1 日 〜 daysInMonth
 * - 上旬: 1 日 〜 10 日
 * - 中旬: 11 日 〜 20 日
 * - 下旬: 21 日 〜 daysInMonth
 */
export function buildP1Presets(
  year: number,
  month: number,
  daysInMonth: number,
): readonly P1Preset[] {
  const monthEnd = { year, month, day: daysInMonth }
  return [
    {
      label: '月全日',
      key: 'full',
      range: { from: { year, month, day: 1 }, to: monthEnd },
    },
    {
      label: '上旬',
      key: 'early',
      range: { from: { year, month, day: 1 }, to: { year, month, day: 10 } },
    },
    {
      label: '中旬',
      key: 'mid',
      range: { from: { year, month, day: 11 }, to: { year, month, day: 20 } },
    },
    {
      label: '下旬',
      key: 'late',
      range: { from: { year, month, day: 21 }, to: monthEnd },
    },
  ]
}

/**
 * 現在の period1 範囲に一致する preset の key を返す。
 * どれにも一致しなければ null（= ユーザが手動指定した自由期間）。
 */
export function findActivePresetKey(
  period: AppDateRange,
  presets: readonly P1Preset[],
): string | null {
  const f = toDateKey(period.from)
  const t = toDateKey(period.to)
  return (
    presets.find((p) => toDateKey(p.range.from) === f && toDateKey(p.range.to) === t)?.key ?? null
  )
}
