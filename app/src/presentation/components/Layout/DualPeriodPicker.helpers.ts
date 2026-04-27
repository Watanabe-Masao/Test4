/**
 * DualPeriodPicker — pure helper functions
 *
 * component 内で inline されていた preset 生成 / preset 検索ロジックを切り出す。
 *
 * CalendarDate ↔ Date 変換（`toJsDate` / `fromJsDate`）は domain 層
 * (`@/domain/models/CalendarDate`) に昇格済み。本ファイルからも re-export して
 * 既存 import path を保つ（後方互換）。
 *
 * 方針: 描画 component は pure 関数を組み合わせるだけ（C1 / F7 準拠）。
 *
 * @responsibility R:unclassified
 */
import type { DateRange as AppDateRange } from '@/domain/models/calendar'
import { toDateKey, toJsDate, fromJsDate } from '@/domain/models/calendar'

// ── CalendarDate ↔ Date 変換（domain 層から re-export）──
export { toJsDate, fromJsDate }

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
