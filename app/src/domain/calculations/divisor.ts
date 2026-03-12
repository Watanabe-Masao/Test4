/**
 * 除数計算の純粋関数
 *
 * 分類別時間帯売上の集計において、日次平均・曜日平均を算出する際の
 * 除数を計算する。全チャートはこれらの関数を経由して除数を取得すること。
 *
 * ## ルール
 *
 * - TR-DIV-001: computeDivisor は mode='total' で 1、それ以外で distinctDayCount を返す
 * - TR-DIV-002: countDistinctDays は実データの distinct day 数を使う（カレンダー日数ではない）
 * - TR-DIV-003: computeDowDivisorMap は曜日別に distinct day 数を返す
 * - 返り値は常に >= 1（0除算防止保証）
 */
import type { CategoryTimeSalesRecord } from '@/domain/models'
import type { AggregateMode } from '@/domain/models/UnifiedFilter'

/**
 * 【TR-DIV-001】集計モードに基づく除数を算出
 *
 * @param distinctDayCount 実データの distinct day 数
 * @param mode 集計モード
 * @returns 除数（>= 1 保証）
 */
export function computeDivisor(distinctDayCount: number, mode: AggregateMode): number {
  if (mode === 'total') return 1
  return distinctDayCount > 0 ? distinctDayCount : 1
}

/**
 * 【TR-DIV-002】レコード配列から distinct day 数を算出
 *
 * @param records フィルタ適用済みレコード配列
 * @returns distinct day 数（0 の場合あり — computeDivisor で安全に除数化される）
 */
export function countDistinctDays(records: readonly CategoryTimeSalesRecord[]): number {
  const days = new Set<number>()
  for (const rec of records) days.add(rec.day)
  return days.size
}

/**
 * 【TR-DIV-003】曜日別の実データ駆動型除数マップを算出
 *
 * ヒートマップ等、曜日ごとに異なる除数が必要な場合に使用する。
 *
 * @param records フィルタ適用済みレコード配列
 * @param year 年（曜日計算用）
 * @param month 月（曜日計算用）
 * @returns Map<曜日(0-6), 実データ日数>（各値は >= 1 保証）
 */
export function computeDowDivisorMap(
  records: readonly CategoryTimeSalesRecord[],
  year: number,
  month: number,
): Map<number, number> {
  const dowDays = new Map<number, Set<number>>()
  for (const rec of records) {
    const dow = new Date(year, month - 1, rec.day).getDay()
    if (!dowDays.has(dow)) dowDays.set(dow, new Set())
    dowDays.get(dow)!.add(rec.day)
  }
  const result = new Map<number, number>()
  for (const [dow, days] of dowDays) {
    result.set(dow, days.size > 0 ? days.size : 1)
  }
  return result
}

/**
 * 【TR-FIL-001】店舗フィルタ
 *
 * selectedStoreIds が空の場合は全レコードを返す（全店舗表示）。
 * 空でない場合は指定店舗のレコードのみを返す。
 *
 * @param records フィルタ対象レコード配列
 * @param selectedStoreIds 選択中の店舗ID集合（空 = 全店舗）
 * @returns 店舗フィルタ適用済みレコード
 */
export function filterByStore(
  records: readonly CategoryTimeSalesRecord[],
  selectedStoreIds: ReadonlySet<string>,
): readonly CategoryTimeSalesRecord[] {
  if (selectedStoreIds.size === 0) return records
  return records.filter((r) => selectedStoreIds.has(r.storeId))
}
