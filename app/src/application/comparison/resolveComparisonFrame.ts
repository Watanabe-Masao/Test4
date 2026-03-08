/**
 * 比較フレーム解決関数
 *
 * 当年の日付範囲とアライメントポリシーから、前年比較用の ComparisonFrame を生成する。
 * 全ページ・全クエリ・全チャートはこの関数を通じて前年期間を取得する。
 *
 * ## 責務
 * - 前年の日付範囲を算出する（唯一の決定箇所）
 * - 同曜日オフセットを算出する
 * - 管理画面からの手動オーバーライドを適用する
 */
import type { DateRange, ComparisonFrame, AlignmentPolicy, PrevYearScope } from '@/domain/models'
import { getDaysInMonth } from '@/domain/constants/defaults'

export interface ComparisonOverrides {
  /** 前年データ取得元の年（null = currentRange.from.year - 1） */
  readonly sourceYear?: number | null
  /** 前年データ取得元の月（null = currentRange.from.month） */
  readonly sourceMonth?: number | null
  /** 曜日オフセット手動指定（null = 自動計算） */
  readonly dowOffset?: number | null
}

/**
 * 月初の曜日差分からオフセットを算出する。
 *
 * 当年 month/1 の曜日 - 前年 month/1 の曜日。
 * 前年の day を (day - offset) にマッピングすると当年の同曜日に対応する。
 */
export function calcSameDowOffset(
  year: number,
  month: number,
  sourceYear?: number,
  sourceMonth?: number,
): number {
  const sy = sourceYear ?? year - 1
  const sm = sourceMonth ?? month
  if (isNaN(year) || isNaN(month) || isNaN(sy) || isNaN(sm)) return 0
  const currentDow = new Date(year, month - 1, 1).getDay()
  const prevDow = new Date(sy, sm - 1, 1).getDay()
  const result = (((currentDow - prevDow) % 7) + 7) % 7
  return isNaN(result) ? 0 : result
}

/**
 * ComparisonFrame を生成する。
 *
 * @param currentRange 当年の表示期間
 * @param policy アライメントポリシー
 * @param overrides 管理画面からの手動オーバーライド
 */
export function resolveComparisonFrame(
  currentRange: DateRange,
  policy: AlignmentPolicy,
  overrides?: ComparisonOverrides,
): ComparisonFrame {
  const curYear = currentRange.from.year
  const curMonth = currentRange.from.month

  // 前年の年月を決定
  const prevYear = validNum(overrides?.sourceYear) ?? curYear - 1
  const prevMonth = validNum(overrides?.sourceMonth) ?? curMonth

  // オフセット算出
  let dowOffset: number
  if (policy === 'sameDate') {
    dowOffset = 0
  } else {
    // sameDayOfWeek
    const manualOffset = validNum(overrides?.dowOffset)
    dowOffset =
      manualOffset != null
        ? Math.max(0, Math.min(6, Math.round(manualOffset)))
        : calcSameDowOffset(curYear, curMonth, prevYear, prevMonth)
  }

  // 前年の日付範囲を構築（前年月の実日数でクランプ）
  const prevDaysInMonth = getDaysInMonth(prevYear, prevMonth)
  const previous: DateRange = {
    from: {
      year: prevYear,
      month: prevMonth,
      day: Math.min(currentRange.from.day, prevDaysInMonth),
    },
    to: { year: prevYear, month: prevMonth, day: Math.min(currentRange.to.day, prevDaysInMonth) },
  }

  return {
    current: currentRange,
    previous,
    dowOffset,
    policy,
  }
}

/**
 * ComparisonFrame + JS 集計値から PrevYearScope を構築する。
 *
 * DOW offset で DuckDB クエリ範囲を JS エンジンの有効範囲に合わせる:
 * - JS は origDay - offset でマッピングし、mappedDay < 1 をスキップ
 * - DuckDB は from.day + offset 〜 min(effectiveEndDay + offset, daysInPrevMonth) をクエリ
 */
export function buildPrevYearScope(
  frame: ComparisonFrame,
  effectiveEndDay: number,
  totalCustomers: number,
): PrevYearScope {
  const offset = frame.dowOffset
  return {
    dateRange: {
      from: {
        ...frame.previous.from,
        day: frame.previous.from.day + offset,
      },
      to: {
        ...frame.previous.to,
        day: Math.min(effectiveEndDay + offset, frame.previous.to.day),
      },
    },
    totalCustomers,
    dowOffset: offset,
  }
}

/** null / undefined / NaN を安全に処理してnumber | undefinedに変換 */
function validNum(v: number | null | undefined): number | undefined {
  if (v == null || isNaN(v)) return undefined
  return v
}
