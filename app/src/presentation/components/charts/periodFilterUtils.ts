/**
 * PeriodFilter 純粋関数ユーティリティ — re-export バレル
 *
 * 正規の定義は domain/calculations/divisor.ts にある。
 * 本ファイルは後方互換のため re-export し、チャートからの import パスを維持する。
 *
 * @see @/domain/calculations/divisor.ts — 正規の定義元
 * @see divisorRules.test.ts — アーキテクチャガードテスト
 * @see PeriodFilter.test.ts — 不変条件テスト
 * @responsibility R:unclassified
 */

// ── 正規ロケーションからの re-export ──────────────────────
export type { AggregateMode } from '@/domain/models/UnifiedFilter'
export {
  computeDivisor,
  countDistinctDays,
  computeDowDivisorMap,
  filterByStore,
} from '@/domain/calculations/divisor'

/* ── Utility: 曜日カウント計算（テスト専用） ─────────────── */

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
