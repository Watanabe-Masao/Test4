/**
 * useFreePeriodAnalysis — 自由期間分析の唯一のファサード
 *
 * FreePeriodAnalysisFrame を入力に、FreePeriodReadModel を返す。
 * AnalysisFrame → ComparisonScope → DuckDB query → ReadModel の
 * 統一パイプラインを接続する最小実装。
 *
 * ## パイプライン
 *
 * 1. FreePeriodAnalysisFrame から query input を構築
 * 2. useQueryWithHandler 経由で DuckDB から取得
 * 3. FreePeriodReadModel（日別行 + 期間サマリー）を返す
 *
 * @layer Application — facade hook
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { FreePeriodAnalysisFrame } from '@/domain/models/AnalysisFrame'
import type { FreePeriodReadModel, FreePeriodQueryInput } from '@/application/readModels/freePeriod'
import { useQueryWithHandler } from './useQueryWithHandler'
import { freePeriodHandler } from '@/application/queries/freePeriodHandler'

import type { CalendarDate } from '@/domain/models/CalendarDate'

/** CalendarDate を YYYY-MM-DD 文字列に変換 */
function toDateString(d: CalendarDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

export interface FreePeriodAnalysisResult {
  /** ReadModel（null = loading / error） */
  readonly data: FreePeriodReadModel | null
  /** ロード中フラグ */
  readonly isLoading: boolean
  /** エラー */
  readonly error: Error | null
}

/**
 * 自由期間分析の唯一のファサード。
 *
 * @param executor DuckDB QueryExecutor（useUnifiedWidgetContext 等から取得）
 * @param frame FreePeriodAnalysisFrame（buildFreePeriodFrame で構築）
 */
export function useFreePeriodAnalysis(
  executor: QueryExecutor,
  frame: FreePeriodAnalysisFrame | null,
): FreePeriodAnalysisResult {
  const input = useMemo((): FreePeriodQueryInput | null => {
    if (!frame) return null

    const dateFrom = toDateString(frame.anchorRange.from)
    const dateTo = toDateString(frame.anchorRange.to)
    // sort で順序差を吸収し、JSON.stringify ベースの cache key を安定化
    const storeIds = frame.storeIds.length > 0 ? [...frame.storeIds].sort() : undefined

    const base: FreePeriodQueryInput = { dateFrom, dateTo, storeIds }

    if (frame.comparison) {
      return {
        ...base,
        comparisonDateFrom: toDateString(frame.comparison.effectivePeriod2.from),
        comparisonDateTo: toDateString(frame.comparison.effectivePeriod2.to),
      }
    }

    return base
  }, [frame])

  const { data, isLoading, error } = useQueryWithHandler(executor, freePeriodHandler, input)

  return { data, isLoading, error }
}
