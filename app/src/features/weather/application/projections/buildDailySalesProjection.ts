/**
 * buildDailySalesProjection — pure projection for weather correlation
 *
 * unify-period-analysis Phase 6 Step D:
 * `StoreDaySummaryRow[]` (DuckDB から返る日×店舗 raw rows) を
 * `DailySalesForCorrelation[]` (天気相関分析の最小入力) に変換する
 * **pure 関数**。
 *
 * Step D 実装の唯一の意味境界。本関数の真理値表 (parity test) で
 * 「row → daily projection 変換の意味」を凍結し、presentation
 * (`WeatherAnalysisPanel.tsx`) は helper を呼ぶだけになる。
 *
 * ## 責務
 *
 *   - 同一 `dateKey` の複数店舗 row を合算 (sales / customers)
 *   - `dateKey` 昇順で安定ソート (天気側 weatherDaily と突合しやすい形)
 *   - 空入力 → 空配列
 *
 * ## 非責務
 *
 *   - dateKey の生成 (= row に既に入っているので propagation する)
 *   - query / DuckDB: caller の責務
 *   - React: 完全に pure
 *   - year/month propagation: 行横断期間でも dateKey 前提で安全
 *
 * ## 使い方
 *
 * ```ts
 * const { data } = useWeatherAnalysisPlan(executor, input)
 * const salesDaily = buildDailySalesProjection(data?.records ?? [])
 * return <WeatherCorrelationChart weatherDaily={...} salesDaily={salesDaily} />
 * ```
 *
 * @see app/src/application/hooks/useWeatherCorrelation.ts
 * @see projects/completed/unify-period-analysis/HANDOFF.md §Phase 6 Step D
 *
 * @responsibility R:unclassified
 */
import type { StoreDaySummaryRow } from '@/application/queries/summary/StoreDaySummaryHandler'
import type { DailySalesForCorrelation } from '@/application/hooks/useWeatherCorrelation'

/**
 * `StoreDaySummaryRow[]` → `DailySalesForCorrelation[]` の pure projection。
 *
 * 同一 `dateKey` の複数店舗 row を合算し、`dateKey` 昇順で返す。空入力のときは
 * 空配列。
 */
export function buildDailySalesProjection(
  rows: readonly StoreDaySummaryRow[],
): readonly DailySalesForCorrelation[] {
  if (rows.length === 0) return []

  const byDateKey = new Map<string, { sales: number; customers: number }>()
  for (const row of rows) {
    const existing = byDateKey.get(row.dateKey)
    if (existing) {
      existing.sales += row.sales
      existing.customers += row.customers
    } else {
      byDateKey.set(row.dateKey, { sales: row.sales, customers: row.customers })
    }
  }

  return [...byDateKey.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, v]) => ({
      dateKey,
      sales: v.sales,
      customers: v.customers,
    }))
}
