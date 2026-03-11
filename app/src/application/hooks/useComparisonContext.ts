/**
 * 比較コンテキストフック
 *
 * ヘッダ期間に依存しない月間全体の比較データを提供する。
 * 3期間（当年月間・前年同曜日・前年同日）のメトリクスと曜日ギャップ分析を
 * 単一の ComparisonContext として返す。
 *
 * ## 設計原則
 *
 * - コンシューマーは null チェック不要（ゼロ値パターン）
 * - SQL がデータ取得、JS が計算（useComparisonContextQuery に委譲）
 * - 下の層は上の層のロジックに依存しない
 * - リクエスト時に if 不要
 * - 比較年月は periodSelection.period2 から導出（settings は参照しない）
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { ComparisonContext } from '@/application/comparison/ComparisonContext'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { createEmptyComparisonContext } from '@/application/comparison/comparisonContextFactory'
import { useComparisonContextQuery } from './duckdb/useComparisonContextQuery'

/**
 * 月間比較コンテキストを提供する。
 *
 * ヘッダの表示期間に関係なく、対象年月の月間全体で
 * 当年・前年同曜日・前年同日の3期間メトリクスを返す。
 *
 * 比較年月は periodSelection.period2 から導出する。
 * settings.prevYearSourceYear/Month は参照しない（Admin UI 補助値のみ）。
 *
 * @param conn DuckDB 接続（null なら空コンテキスト）
 * @param dataVersion データバージョン（再クエリトリガー）
 * @param storeIds 対象店舗
 * @returns ComparisonContext（常に非 null、isReady で読み込み完了を判別）
 */
export function useComparisonContext(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  storeIds: ReadonlySet<string>,
): ComparisonContext {
  const settings = useSettingsStore((s) => s.settings)
  const targetYear = settings.targetYear
  const targetMonth = settings.targetMonth
  const defaultMarkupRate = settings.defaultMarkupRate

  // 比較年月は periodSelection.period2 から導出（settings は参照しない）
  const periodSelection = usePeriodSelectionStore((s) => s.selection)
  const prevYear = periodSelection.period2.from.year
  const prevMonth = periodSelection.period2.from.month

  // DuckDB クエリ + JS 計算（infrastructure 参照は duckdb/ 層に閉じ込める）
  const { data } = useComparisonContextQuery(
    conn,
    dataVersion,
    targetYear,
    targetMonth,
    prevYear,
    prevMonth,
    storeIds,
    defaultMarkupRate,
  )

  // ゼロ値パターン: data が null（読み込み中/未取得）なら空コンテキストを返す
  return useMemo(
    () => data ?? createEmptyComparisonContext(targetYear, targetMonth),
    [data, targetYear, targetMonth],
  )
}
