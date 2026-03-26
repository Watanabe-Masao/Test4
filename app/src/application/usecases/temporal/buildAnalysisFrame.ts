/**
 * buildAnalysisFrame — AnalysisRequest → AnalysisFrame
 *
 * AnalysisRequest を rolling / non-rolling の discriminated union frame に変換する。
 *
 * rolling 系（movingAverage / rollingSum）:
 *   - windowSize 必須（未指定/非正でエラー）
 *   - direction 既定値: 'trailing'
 *
 * non-rolling 系（cumulative / trend）:
 *   - windowSize / direction は型レベルで存在しない
 *
 * granularity は受け取るが、Phase 1 では buildTemporalFetchPlan が day の rolling 系だけを扱う。
 */
import type { AnalysisRequest } from '@/domain/models/temporal'
import type {
  RollingAnalysisFrame,
  NonRollingAnalysisFrame,
  AnalysisFrame,
} from './TemporalFrameTypes'

/**
 * AnalysisRequest を AnalysisFrame に変換する。
 *
 * @throws rolling 系で windowSize が未指定または非正の場合
 */
export function buildAnalysisFrame(request: AnalysisRequest): AnalysisFrame {
  const { analysisMode } = request

  if (analysisMode === 'movingAverage' || analysisMode === 'rollingSum') {
    if (request.windowSize == null) {
      throw new Error(`${analysisMode} requires windowSize, but it was not provided.`)
    }
    if (!Number.isInteger(request.windowSize) || request.windowSize <= 0) {
      throw new Error(`windowSize must be a positive integer, got ${request.windowSize}.`)
    }

    const frame: RollingAnalysisFrame = {
      kind: 'analysis-frame',
      anchorRange: request.anchorRange,
      storeIds: request.storeIds,
      metric: request.metric,
      granularity: request.granularity,
      analysisMode,
      windowSize: request.windowSize,
      direction: request.direction ?? 'trailing',
    }
    return frame
  }

  // non-rolling 系: cumulative / trend
  const frame: NonRollingAnalysisFrame = {
    kind: 'analysis-frame',
    anchorRange: request.anchorRange,
    storeIds: request.storeIds,
    metric: request.metric,
    granularity: request.granularity,
    analysisMode,
  }
  return frame
}
