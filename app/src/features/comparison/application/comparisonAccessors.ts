/**
 * Comparison Accessors — alignment-aware な前年データアクセス API
 *
 * prevYear.daily Map への直接アクセスをこの API に集約する。
 * Map キーは当期の日付（targetDayKey）で構築されているため、
 * year/month/day は「当期の日付」として渡す必要がある。
 *
 * この API が意図を名前に埋め込むことで、
 * 消費側が alignment semantics を理解する必要をなくす。
 *
 * @guard Q4 alignment-aware access は handler/resolver に閉じる
 * @see buildComparisonAggregation.ts — Map 構築時に alignment を適用
 */
import type { PrevYearData, PrevYearDailyEntry } from './comparisonTypes'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'

/**
 * 当期の日付を指定して、alignment 済みの前年日別データを取得する。
 *
 * prevYear.daily の Map キーは targetDayKey（当期の日付キー）で構築されている。
 * alignment（sameDate / sameDayOfWeek）は Map 構築時に適用済みなので、
 * 消費側は「当期の何日のデータが欲しいか」を指定するだけでよい。
 *
 * @param prevYear  PrevYearData（useComparisonModule() から取得）
 * @param year      当期の年
 * @param month     当期の月
 * @param day       当期の日
 * @returns 前年日別データ。該当日のデータがない場合は undefined。
 */
export function getPrevYearDailyValue(
  prevYear: PrevYearData,
  year: number,
  month: number,
  day: number,
): PrevYearDailyEntry | undefined {
  return prevYear.daily.get(toDateKeyFromParts(year, month, day))
}

/**
 * 当期の日付を指定して、alignment 済みの前年売上を取得する。
 * データがない場合は 0 を返す。
 */
export function getPrevYearDailySales(
  prevYear: PrevYearData,
  year: number,
  month: number,
  day: number,
): number {
  return getPrevYearDailyValue(prevYear, year, month, day)?.sales ?? 0
}

/**
 * PrevYearData から前年客数を数値として抽出する。
 *
 * PrevYearData.totalCustomers は同曜日 alignment 済みの比較用客数。
 * このヘルパーを通すことで、消費側に `.totalCustomers` が現れない。
 * @see references/01-principles/customer-definition.md
 */
export function extractPrevYearCustomerCount(prevYear: PrevYearData): number {
  return prevYear.totalCustomers
}
