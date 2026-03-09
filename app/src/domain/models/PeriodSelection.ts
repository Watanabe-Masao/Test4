/**
 * 期間選択モデル — 月跨ぎ対応の自由日付範囲
 *
 * 従来の targetYear/targetMonth + dataEndDay + ComparisonFrame を統合し、
 * 任意の日付範囲による分析・比較を可能にする。
 *
 * ## 4つの期間
 *
 * 1. period1 (当期): ユーザーが分析したい期間
 * 2. period2 (比較期): 比較対象の期間（比較ON時のみ使用）
 * 3. period1Adjacent: period1 の前後1ヶ月（移動平均用、自動算出）
 * 4. period2Adjacent: period2 の前後1ヶ月（移動平均用、自動算出）
 *
 * ## 設計原則
 *
 * - DateRange は月を跨いでもよい（from.month !== to.month も有効）
 * - プリセットはショートカット。適用後にユーザーが自由に再指定可能
 * - 期間-1 のスライダーを動かしても期間-2 は連動しない（自由選択）
 * - プリセット適用時のみ期間-2 も連動して更新される
 * - 比較の初期値は ON
 */
import type { DateRange, CalendarDate } from './CalendarDate'

/** 比較プリセット — 期間-2 の自動算出方法 */
export type ComparisonPreset =
  | 'prevYearSameMonth' // 前年同月
  | 'prevYearSameDow' // 前年同曜日合わせ
  | 'prevMonth' // 前月
  | 'custom' // 自由指定（プリセットなし）

/** 期間選択の永続化対象 */
export interface PeriodSelection {
  /** 当期（分析対象期間） */
  readonly period1: DateRange
  /** 比較期（比較対象期間） */
  readonly period2: DateRange
  /** 比較表示の ON/OFF */
  readonly comparisonEnabled: boolean
  /** 適用中のプリセット（custom = 自由指定中） */
  readonly activePreset: ComparisonPreset
}

/**
 * 隣接月の範囲 — 移動平均・月跨ぎ計算用
 *
 * period の前後1ヶ月分の範囲を保持する。
 * 取得タイミングの最適化のため、事前に算出しておく。
 */
export interface AdjacentMonths {
  /** 前月の全日範囲 */
  readonly prevMonth: DateRange
  /** 翌月の全日範囲 */
  readonly nextMonth: DateRange
}

/**
 * 4期間すべてをまとめたクエリ入力
 *
 * DuckDB クエリはこの型を受け取り、必要なデータを一括取得する。
 */
export interface PeriodQueryInput {
  /** 当期 */
  readonly period1: DateRange
  /** 当期の隣接月 */
  readonly period1Adjacent: AdjacentMonths
  /** 比較期（comparisonEnabled = false なら undefined） */
  readonly period2?: DateRange
  /** 比較期の隣接月（comparisonEnabled = false なら undefined） */
  readonly period2Adjacent?: AdjacentMonths
}

// ── ユーティリティ関数 ──

/** 月の最終日を算出 */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** CalendarDate から1ヶ月前の全日範囲を算出 */
function prevMonthRange(date: CalendarDate): DateRange {
  const m = date.month === 1 ? 12 : date.month - 1
  const y = date.month === 1 ? date.year - 1 : date.year
  return {
    from: { year: y, month: m, day: 1 },
    to: { year: y, month: m, day: lastDayOfMonth(y, m) },
  }
}

/** CalendarDate から1ヶ月後の全日範囲を算出 */
function nextMonthRange(date: CalendarDate): DateRange {
  const m = date.month === 12 ? 1 : date.month + 1
  const y = date.month === 12 ? date.year + 1 : date.year
  return {
    from: { year: y, month: m, day: 1 },
    to: { year: y, month: m, day: lastDayOfMonth(y, m) },
  }
}

/**
 * DateRange から隣接月を算出する。
 *
 * from の月の前月と to の月の翌月を返す。
 * 月跨ぎ時は from.month と to.month が異なる場合があるが、
 * 前後1ヶ月はそれぞれの端の月を基準にする。
 */
export function calcAdjacentMonths(range: DateRange): AdjacentMonths {
  return {
    prevMonth: prevMonthRange(range.from),
    nextMonth: nextMonthRange(range.to),
  }
}

/**
 * PeriodSelection から PeriodQueryInput を構築する。
 *
 * comparisonEnabled = false の場合、period2 関連は undefined。
 */
export function buildPeriodQueryInput(selection: PeriodSelection): PeriodQueryInput {
  const period1Adjacent = calcAdjacentMonths(selection.period1)

  if (!selection.comparisonEnabled) {
    return { period1: selection.period1, period1Adjacent }
  }

  return {
    period1: selection.period1,
    period1Adjacent,
    period2: selection.period2,
    period2Adjacent: calcAdjacentMonths(selection.period2),
  }
}

/**
 * プリセットから期間-2 を算出する。
 *
 * period1 を基準に、プリセットに従って比較期間を自動生成する。
 * 'custom' の場合は現在の period2 をそのまま返す。
 */
export function applyPreset(
  period1: DateRange,
  preset: ComparisonPreset,
  currentPeriod2: DateRange,
): DateRange {
  switch (preset) {
    case 'prevYearSameMonth':
      return {
        from: {
          year: period1.from.year - 1,
          month: period1.from.month,
          day: Math.min(
            period1.from.day,
            lastDayOfMonth(period1.from.year - 1, period1.from.month),
          ),
        },
        to: {
          year: period1.to.year - 1,
          month: period1.to.month,
          day: Math.min(
            period1.to.day,
            lastDayOfMonth(period1.to.year - 1, period1.to.month),
          ),
        },
      }

    case 'prevYearSameDow': {
      // 前年同月の月初曜日差分でオフセットして同曜日に合わせる
      const prevYear = period1.from.year - 1
      const currentDow = new Date(period1.from.year, period1.from.month - 1, 1).getDay()
      const prevDow = new Date(prevYear, period1.from.month - 1, 1).getDay()
      const offset = ((currentDow - prevDow) % 7 + 7) % 7
      const prevDaysInMonth = lastDayOfMonth(prevYear, period1.from.month)

      return {
        from: {
          year: prevYear,
          month: period1.from.month,
          day: Math.min(period1.from.day + offset, prevDaysInMonth),
        },
        to: {
          year: period1.to.year - 1,
          month: period1.to.month,
          day: Math.min(period1.to.day + offset, lastDayOfMonth(period1.to.year - 1, period1.to.month)),
        },
      }
    }

    case 'prevMonth': {
      const fromM = period1.from.month === 1 ? 12 : period1.from.month - 1
      const fromY = period1.from.month === 1 ? period1.from.year - 1 : period1.from.year
      const toM = period1.to.month === 1 ? 12 : period1.to.month - 1
      const toY = period1.to.month === 1 ? period1.to.year - 1 : period1.to.year

      return {
        from: {
          year: fromY,
          month: fromM,
          day: Math.min(period1.from.day, lastDayOfMonth(fromY, fromM)),
        },
        to: {
          year: toY,
          month: toM,
          day: Math.min(period1.to.day, lastDayOfMonth(toY, toM)),
        },
      }
    }

    case 'custom':
      return currentPeriod2
  }
}

/**
 * デフォルトの PeriodSelection を生成する。
 *
 * 当月の1日〜月末を period1 とし、前年同月をプリセットで設定。
 * 比較は初期値 ON。
 */
export function createDefaultPeriodSelection(year: number, month: number): PeriodSelection {
  const daysInMonth = lastDayOfMonth(year, month)
  const period1: DateRange = {
    from: { year, month, day: 1 },
    to: { year, month, day: daysInMonth },
  }

  const period2 = applyPreset(period1, 'prevYearSameMonth', period1)

  return {
    period1,
    period2,
    comparisonEnabled: true,
    activePreset: 'prevYearSameMonth',
  }
}
