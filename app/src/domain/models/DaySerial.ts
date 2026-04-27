/**
 * DaySerial — 日付の連続整数表現
 *
 * 2000-01-01 を基準日(0)とした連続整数で日付を表現する。
 * 日数差・範囲フィルタ・移動平均窓の計算が単純な整数演算で行える。
 *
 * ## 設計原則
 *
 * - Branded Type で型安全性を確保（number と混同しない）
 * - CalendarDate / DateKey との相互変換を提供
 * - Date オブジェクトは変換時のみ使用（内部的に UTC で計算）
 *
 * ## 使用例
 *
 * ```ts
 * const s1 = dateKeyToSerial('2026-03-01')  // → 9556
 * const s2 = dateKeyToSerial('2026-03-07')  // → 9562
 * s2 - s1  // → 6（6日間の差）
 * ```
 *
 * @responsibility R:unclassified
 */
import type { CalendarDate, DateKey } from './CalendarDate'

/** 2000-01-01 を基準日(0)とした連続整数。Branded Type で型安全。 */
export type DaySerial = number & { readonly __brand: 'DaySerial' }

/** 基準日: 2000-01-01 00:00:00 UTC のエポックミリ秒 */
const EPOCH_MS = Date.UTC(2000, 0, 1)

/** 1日のミリ秒 */
const MS_PER_DAY = 86_400_000

// ── 変換関数 ──

/**
 * CalendarDate → DaySerial
 *
 * UTC で計算するため、タイムゾーンの影響を受けない。
 */
export function calendarToSerial(date: CalendarDate): DaySerial {
  const ms = Date.UTC(date.year, date.month - 1, date.day)
  return Math.floor((ms - EPOCH_MS) / MS_PER_DAY) as DaySerial
}

/**
 * DateKey ('YYYY-MM-DD') → DaySerial
 *
 * dateKey のフォーマットが正しいことを前提とする。
 */
export function dateKeyToSerial(dateKey: DateKey): DaySerial {
  const parts = dateKey.split('-')
  const ms = Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return Math.floor((ms - EPOCH_MS) / MS_PER_DAY) as DaySerial
}

/**
 * DaySerial → DateKey ('YYYY-MM-DD')
 */
export function serialToDateKey(serial: DaySerial): DateKey {
  const date = new Date(EPOCH_MS + serial * MS_PER_DAY)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * DaySerial → CalendarDate
 */
export function serialToCalendar(serial: DaySerial): CalendarDate {
  const date = new Date(EPOCH_MS + serial * MS_PER_DAY)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

// ── DateRange との統合 ──

// dateRangeToSerials / dateRangeToBounds — 利用箇所なし。削除済み

// ── ユーティリティ ──

/**
 * 2つの DaySerial 間の日数差を返す（b - a）。
 *
 * 正の値: b が a より後。負の値: b が a より前。
 */
export function daysBetween(a: DaySerial, b: DaySerial): number {
  return b - a
}

/**
 * DaySerial の曜日を取得する (0=日, 1=月, ..., 6=土)。
 *
 * 2000-01-01 は土曜日(6)。
 * (serial + 6) % 7 で算出（Date オブジェクト不要）。
 */
export function serialToDow(serial: DaySerial): number {
  return (((serial % 7) + 7 + 6) % 7) as number
}
