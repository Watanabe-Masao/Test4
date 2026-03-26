/**
 * buildTemporalInputFromDashboardScope
 *
 * Dashboard の header / widget 文脈から MovingAverageInput を組み立てる。
 * header state を読む唯一の層。チャート本体は header の比較文脈を直接知らない。
 *
 * Phase 5: 最初の consumer は「日別売上・売変推移」チャートの売上7日移動平均 overlay。
 */
import type { DateRange } from '@/domain/models/CalendarDate'
import type { AnalysisMetric } from '@/domain/models/temporal'
import type { MovingAverageInput } from '@/application/queries/temporal/MovingAverageHandler'
import type { MovingAverageMissingnessPolicy } from '@/domain/calculations/temporal/computeMovingAverage'

export interface DashboardTemporalScope {
  readonly currentDateRange: DateRange | undefined
  readonly selectedStoreIds: ReadonlySet<string>
}

export interface TemporalOverlayConfig {
  readonly metric: AnalysisMetric
  readonly windowSize: number
  readonly policy: MovingAverageMissingnessPolicy
}

/** Phase 5 デフォルト設定: 売上7日移動平均、strict */
export const DEFAULT_OVERLAY_CONFIG: TemporalOverlayConfig = {
  metric: 'sales',
  windowSize: 7,
  policy: 'strict',
}

/**
 * Dashboard scope から MovingAverageInput を組み立てる。
 *
 * currentDateRange が未設定の場合は null を返す（query 未実行）。
 * チャートが rolling 計算を知らずに overlay を受けられるようにする。
 */
export function buildTemporalInputFromDashboardScope(
  scope: DashboardTemporalScope,
  config: TemporalOverlayConfig = DEFAULT_OVERLAY_CONFIG,
): MovingAverageInput | null {
  if (!scope.currentDateRange) return null

  return {
    frame: {
      kind: 'analysis-frame',
      anchorRange: scope.currentDateRange,
      storeIds: scope.selectedStoreIds.size > 0 ? [...scope.selectedStoreIds] : [],
      metric: config.metric,
      granularity: 'day',
      analysisMode: 'movingAverage',
      windowSize: config.windowSize,
      direction: 'trailing',
    },
    policy: config.policy,
  }
}
