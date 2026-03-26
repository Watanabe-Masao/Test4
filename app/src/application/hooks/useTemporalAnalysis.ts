/**
 * useTemporalAnalysis — temporal analysis の独立入口
 *
 * useQueryWithHandler の thin wrapper。
 * business logic を持たない。useUnifiedWidgetContext に触れない。
 *
 * Phase 3 時点では moving average のみ対応。
 * Phase 5 で rolling sum / cumulative / trend に汎化予定。
 * hook 名は API 安定性のため変更しない。
 *
 * @see references/03-guides/temporal-analysis-policy.md
 */
import { useMemo } from 'react'
import type { AsyncQueryResult } from '@/application/queries/QueryContract'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  movingAverageHandler,
  type MovingAverageInput,
  type MovingAverageOutput,
} from '@/application/queries/temporal/MovingAverageHandler'
import {
  buildTemporalInputFromDashboardScope,
  type DashboardTemporalScope,
  type TemporalOverlayConfig,
  DEFAULT_OVERLAY_CONFIG,
} from '@/application/usecases/temporal/buildTemporalInputFromDashboardScope'

/**
 * 移動平均を QueryHandler 経由で取得する（低レベル API）。
 *
 * UI は requiredRange / requiredMonths を知らずに呼べる。
 */
export function useTemporalAnalysis(
  executor: QueryExecutor | null,
  input: MovingAverageInput | null,
): AsyncQueryResult<MovingAverageOutput> {
  return useQueryWithHandler(executor, movingAverageHandler, input)
}

/**
 * Dashboard scope から移動平均 overlay を取得する（高レベル API）。
 *
 * Presentation 層が application/usecases/ を直接 import せずに
 * temporal overlay を取得するための入口。
 */
export function useMovingAverageOverlay(
  executor: QueryExecutor | null,
  scope: DashboardTemporalScope,
  enabled: boolean,
  config: TemporalOverlayConfig = DEFAULT_OVERLAY_CONFIG,
): AsyncQueryResult<MovingAverageOutput> {
  const input = useMemo(
    () => (enabled ? buildTemporalInputFromDashboardScope(scope, config) : null),
    [enabled, scope, config],
  )
  return useQueryWithHandler(executor, movingAverageHandler, input)
}
