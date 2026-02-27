/**
 * PeriodFilter 純粋関数ユーティリティ
 *
 * PeriodFilter.tsx から分離された純粋関数群。
 * 全チャートはこれらの関数を通じて除数算出・店舗フィルタを行うこと。
 *
 * @see PeriodFilter.tsx — 設計ルール (RULE-1〜RULE-6) の詳細
 * @see divisorRules.test.ts — アーキテクチャガードテスト
 * @see PeriodFilter.test.ts — 不変条件テスト
 */
import type { CategoryTimeSalesRecord } from '@/domain/models'

/* ── Types ──────────────────────────────────────────────── */

export type AggregateMode = 'total' | 'dailyAvg' | 'dowAvg'

/* ── 技術ルール: 実データ駆動型除数 (Data-Driven Divisor Rules) ── */

/**
 * 【TR-DIV-001】除数算出ルール
 *
 * 実データの distinct day 数と集計モードから除数を算出する純粋関数。
 * **全チャートはこの関数を通じて除数を一元的に算出すること。**
 *
 * 不変条件:
 *   - mode === 'total' → 必ず 1 を返す
 *   - 返り値は常に >= 1（0除算防止保証）
 *   - distinctDayCount が 0 でも安全（1 を返す）
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
 * レコードの `.day` フィールドをユニークカウントする。
 * 店舗フィルタ等の事前フィルタ適用後のレコードを渡すこと。
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
 * 【TR-DIV-003】曜日別の実データ駆動型除数を算出
 *
 * ヒートマップ等、曜日ごとに異なる除数が必要な場合に使用する。
 * 各曜日について、その曜日に該当する distinct day 数をカウントする。
 *
 * 使用例: dowAvg モードのヒートマップで、月曜は 4 日分、火曜は 3 日分
 * のように曜日ごとに異なる除数を適用する場合。
 *
 * @param records filterRecords() 適用済みのレコード配列
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

/* ── フィルタリング純粋関数 ────────────────────────────── */

/**
 * 【TR-FIL-001】店舗フィルタ
 *
 * selectedStoreIds が空の場合は全レコードを返す（全店舗表示）。
 * 空でない場合は指定店舗のレコードのみを返す。
 *
 * 全チャートはこの関数を通じて店舗絞り込みを一元的に行うこと。
 * インラインの `if (selectedStoreIds.size > 0 && !selectedStoreIds.has(...)) continue`
 * は設計違反。
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

/* ── Utility: 曜日カウント計算 ─────────────────────────── */

/**
 * 指定月の dayRange 内で各曜日 (0=日〜6=土) が何日あるか返す。
 *
 * 閏年・月末日数の違いを正しく反映する。
 * テストでの比較検証用に export する。チャートコード内での除数用途には使用禁止。
 *
 * @param year  対象年（例: 2026）
 * @param month 対象月 1-12
 * @param from  開始日（1-based）
 * @param to    終了日（1-based, inclusive）
 * @returns Map<曜日(0-6), 出現回数>
 *
 * @example
 * // 2026年2月（28日間）→ 各曜日4回ずつ
 * countDowInRange(2026, 2, 1, 28)
 * // => Map { 0=>4, 1=>4, 2=>4, 3=>4, 4=>4, 5=>4, 6=>4 }
 *
 * @example
 * // 2024年2月（閏年29日間）→ 木曜だけ5回
 * countDowInRange(2024, 2, 1, 29)
 * // => Map { 4=>5, 0=>4, 1=>4, ... }
 */
export function countDowInRange(
  year: number,
  month: number,
  from: number,
  to: number,
): Map<number, number> {
  const counts = new Map<number, number>()
  for (let d = from; d <= to; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    counts.set(dow, (counts.get(dow) ?? 0) + 1)
  }
  return counts
}
