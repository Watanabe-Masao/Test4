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
import type { PrevYearScope } from './ComparisonFrame'
import { DOW_ALIGNMENT_WINDOW, DAYS_PER_WEEK } from '@/domain/constants'

/** 比較プリセット — 期間-2 の自動算出方法 */
export type ComparisonPreset =
  | 'prevYearSameMonth' // 前年同月
  | 'prevYearSameDow' // 前年同曜日合わせ
  | 'prevMonth' // 前月
  | 'prevWeek' // 前週（-7日）
  | 'prevYearNextWeek' // 前年翌週（-1年 +7日）
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
          day: Math.min(period1.to.day, lastDayOfMonth(period1.to.year - 1, period1.to.month)),
        },
      }

    case 'prevYearSameDow': {
      // V2: period2 は「1:1 比較期間」ではなく「resolver 用の候補取得範囲」。
      // sameDayOfWeek の比較先は resolveComparisonRows が日単位で解決する。
      // ここでは resolver が ±7 日の候補を引けるよう、前年同日 ±7 日の範囲を返す。
      const candidateWindow = DOW_ALIGNMENT_WINDOW
      const fromDate = new Date(
        period1.from.year - 1,
        period1.from.month - 1,
        period1.from.day - candidateWindow,
      )
      const toDate = new Date(
        period1.to.year - 1,
        period1.to.month - 1,
        period1.to.day + candidateWindow,
      )

      return {
        from: {
          year: fromDate.getFullYear(),
          month: fromDate.getMonth() + 1,
          day: fromDate.getDate(),
        },
        to: {
          year: toDate.getFullYear(),
          month: toDate.getMonth() + 1,
          day: toDate.getDate(),
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

    case 'prevWeek': {
      // 前週: period1 を -7日シフト（既存 WoW と統一）
      const fromDate = new Date(
        period1.from.year,
        period1.from.month - 1,
        period1.from.day - DAYS_PER_WEEK,
      )
      const toDate = new Date(period1.to.year, period1.to.month - 1, period1.to.day - DAYS_PER_WEEK)
      return {
        from: {
          year: fromDate.getFullYear(),
          month: fromDate.getMonth() + 1,
          day: fromDate.getDate(),
        },
        to: {
          year: toDate.getFullYear(),
          month: toDate.getMonth() + 1,
          day: toDate.getDate(),
        },
      }
    }

    case 'prevYearNextWeek': {
      // 前年翌週: period1 を -1年 +7日シフト
      const fromDate = new Date(
        period1.from.year - 1,
        period1.from.month - 1,
        period1.from.day + DAYS_PER_WEEK,
      )
      const toDate = new Date(
        period1.to.year - 1,
        period1.to.month - 1,
        period1.to.day + DAYS_PER_WEEK,
      )
      return {
        from: {
          year: fromDate.getFullYear(),
          month: fromDate.getMonth() + 1,
          day: fromDate.getDate(),
        },
        to: {
          year: toDate.getFullYear(),
          month: toDate.getMonth() + 1,
          day: toDate.getDate(),
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

/**
 * PeriodSelection から DOW オフセットを導出する。
 *
 * prevYearSameDow プリセット時のみ非ゼロ。
 * period1 の月初曜日と、その前年同月の月初曜日の差から算出する。
 *
 * 注意: period2 は候補取得窓（前年同日 ±7日）のため from.month が
 * 前月にずれうる。比較基準月は常に period1 の前年同月を使う。
 */
export function deriveDowOffset(period1: DateRange, preset: ComparisonPreset): number {
  if (preset !== 'prevYearSameDow') return 0
  const currentDow = new Date(period1.from.year, period1.from.month - 1, 1).getDay()
  const prevDow = new Date(period1.from.year - 1, period1.from.month - 1, 1).getDay()
  return (((currentDow - prevDow) % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK
}

/**
 * prevYearSameDow プリセット時の実際の比較期間を算出する。
 *
 * selection.period2 は ±7日の候補取得窓であり、実際の比較期間ではない。
 * period1 から1年前にシフトし、dowOffset 分を加算して同曜日合わせした
 * 正確な比較期間を返す。
 *
 * prevYearSameDow 以外のプリセットでは selection.period2 をそのまま返す。
 */
export function deriveEffectivePeriod2(selection: PeriodSelection): DateRange {
  const offset = deriveDowOffset(selection.period1, selection.activePreset)
  if (selection.activePreset !== 'prevYearSameDow' || offset === 0) {
    return selection.period2
  }
  // 前年日付 = year-1 + dowOffset日（Date演算で閏年・月跨ぎを正しく処理）
  const prevFrom = new Date(
    selection.period1.from.year - 1,
    selection.period1.from.month - 1,
    selection.period1.from.day + offset,
  )
  const prevTo = new Date(
    selection.period1.to.year - 1,
    selection.period1.to.month - 1,
    selection.period1.to.day + offset,
  )
  return {
    from: {
      year: prevFrom.getFullYear(),
      month: prevFrom.getMonth() + 1,
      day: prevFrom.getDate(),
    },
    to: {
      year: prevTo.getFullYear(),
      month: prevTo.getMonth() + 1,
      day: prevTo.getDate(),
    },
  }
}

/**
 * PeriodSelection + JS集計値から PrevYearScope を構築する。
 *
 * 旧 buildPrevYearScope(ComparisonFrame, effectiveEndDay, totalCustomers) を置換。
 *
 * 新モデルでは period2 にオフセットが既に焼き込まれているため、
 * ComparisonFrame による調整が不要。
 *
 * effectiveEndDay が指定された場合、前年の to.day を
 * min(effectiveEndDay + offset, period2.to.day) にキャップして
 * JS エンジンの有効範囲と DuckDB クエリ範囲を一致させる。
 *
 * @param selection 期間選択状態
 * @param totalCustomers JS エンジンで算出された前年客数（period2 と同スコープ）
 * @param effectiveEndDay 当期の有効日数（データ可用性による上限）
 */
export function buildPrevYearScopeFromSelection(
  selection: PeriodSelection,
  totalCustomers: number,
  effectiveEndDay?: number,
): PrevYearScope {
  const offset = deriveDowOffset(selection.period1, selection.activePreset)
  const period2 = selection.period2

  if (effectiveEndDay != null) {
    // Date 演算で月跨ぎを正しく処理する
    const capDate = new Date(period2.from.year, period2.from.month - 1, effectiveEndDay + offset)
    const toDate = new Date(period2.to.year, period2.to.month - 1, period2.to.day)
    const effectiveTo = capDate < toDate ? capDate : toDate
    return {
      dateRange: {
        from: period2.from,
        to: {
          year: effectiveTo.getFullYear(),
          month: effectiveTo.getMonth() + 1,
          day: effectiveTo.getDate(),
        },
      },
      totalCustomers,
      dowOffset: offset,
    }
  }

  return {
    dateRange: period2,
    totalCustomers,
    dowOffset: offset,
  }
}
