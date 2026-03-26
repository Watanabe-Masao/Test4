/**
 * useTemporalAnalysis — temporal analysis の独立入口
 *
 * useQueryWithHandler の thin wrapper。
 * business logic を持たない。useUnifiedWidgetContext に触れない。
 *
 * @see references/03-guides/temporal-analysis-policy.md
 */
import type { AsyncQueryResult } from '@/application/queries/QueryContract'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  movingAverageHandler,
  type MovingAverageInput,
  type MovingAverageOutput,
} from '@/application/queries/temporal/MovingAverageHandler'

/**
 * 移動平均を QueryHandler 経由で取得する。
 *
 * UI は requiredRange / requiredMonths を知らずに呼べる。
 * MovingAverageHandler が fetch plan → query → series → rolling を閉じる。
 */
export function useTemporalAnalysis(
  executor: QueryExecutor | null,
  input: MovingAverageInput | null,
): AsyncQueryResult<MovingAverageOutput> {
  return useQueryWithHandler(executor, movingAverageHandler, input)
}
