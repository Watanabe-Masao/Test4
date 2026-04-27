/**
 * Daily Series — 型定義 + ヘルパー
 *
 * Phase 2: requiredRange を連続日次系列に変換するための型。
 * 値の解釈（平均・累計・比較）はまだ行わない。
 *
 * @responsibility R:unclassified
 */
import type { CalendarDate } from '@/domain/models/CalendarDate'
import type { YearMonthKey } from '@/application/usecases/temporal/TemporalFrameTypes'

// ── メトリックキー ──

/**
 * 系列で使用するメトリックキー（DailySeriesSourceRow.values のキーと対応）。
 * 将来 AnalysisMetric に寄せる余地あり。
 */
export type DailySeriesMetricKey = string

// ── DailySeriesPoint ──

/** Phase 2 の series point ステータス（outside_scope は Phase 3 以降で追加予定） */
export type DailySeriesStatus = 'ok' | 'missing'

export interface DailySeriesPoint {
  readonly date: CalendarDate
  readonly dateKey: string
  readonly value: number | null
  readonly sourceMonthKey: YearMonthKey
  readonly status: DailySeriesStatus
}

// ── DailySeriesSourceRow ──

/**
 * query row から変換する最小構造。
 *
 * row が存在しても values[metric] が未定義/null の場合は、
 * その日のデータ欠損とみなす（sourceMonthKey は row 由来を保持する）。
 */
export interface DailySeriesSourceRow {
  readonly date: CalendarDate
  readonly dateKey: string
  readonly sourceMonthKey: YearMonthKey
  readonly values: Readonly<Record<string, number | null | undefined>>
}

// ── ヘルパー ──

/**
 * CalendarDate から YearMonthKey を導出する。
 * sourceMonthKey の生成規則を1箇所に固定する。
 */
export function toYearMonthKey(date: CalendarDate): YearMonthKey {
  return `${date.year}-${String(date.month).padStart(2, '0')}` as YearMonthKey
}
