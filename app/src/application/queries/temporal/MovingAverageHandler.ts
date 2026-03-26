/**
 * MovingAverageHandler — 移動平均 QueryHandler
 *
 * 責務は orchestration のみ:
 * 1. buildTemporalFetchPlan(frame) で requiredRange/requiredMonths 導出
 * 2. queryStoreDaySummary(conn, params) で rows 取得
 * 3. adaptStoreDaySummaryRow で DailySeriesSourceRow[] 変換
 * 4. buildDailySeries(plan, sourceRows, frame.metric) で連続系列構築
 * 5. computeMovingAverage(series, frame.windowSize, policy) で計算
 * 6. anchorRange に切り戻し
 *
 * row adapter / metric 解釈は services/temporal/ に委譲。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { QueryHandler } from '@/application/queries/QueryContract'
import type { DailySeriesPoint } from '@/application/services/temporal/DailySeriesTypes'
import type {
  RollingAnalysisFrame,
  YearMonthKey,
} from '@/application/usecases/temporal/TemporalFrameTypes'
import type { MovingAverageMissingnessPolicy } from '@/domain/calculations/temporal/computeMovingAverage'
import { buildTemporalFetchPlan } from '@/application/usecases/temporal/buildTemporalFetchPlan'
import { buildDailySeries } from '@/application/services/temporal/buildDailySeries'
import { adaptStoreDaySummaryRow } from '@/application/services/temporal/storeDaySummaryTemporalAdapter'
import type { StoreDaySummaryRowForTemporal } from '@/application/services/temporal/storeDaySummaryTemporalAdapter'
import { computeMovingAverage } from '@/domain/calculations/temporal/computeMovingAverage'
import { queryStoreDaySummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import { toDateKey } from '@/domain/models/CalendarDate'
import type { DateRange } from '@/domain/models/CalendarDate'

// ── Input / Output ──

export interface MovingAverageInput {
  readonly frame: RollingAnalysisFrame
  readonly policy: MovingAverageMissingnessPolicy
}

export interface MovingAverageOutput {
  readonly anchorSeries: readonly DailySeriesPoint[]
  readonly requiredMonths: readonly YearMonthKey[]
}

// ── Helpers ──

/** anchorRange 内の points だけを抽出する */
function sliceToAnchorRange(
  series: readonly DailySeriesPoint[],
  anchorRange: DateRange,
): readonly DailySeriesPoint[] {
  const fromKey = toDateKey(anchorRange.from)
  const toKey = toDateKey(anchorRange.to)
  return series.filter((p) => p.dateKey >= fromKey && p.dateKey <= toKey)
}

// ── Handler ──

export const movingAverageHandler: QueryHandler<MovingAverageInput, MovingAverageOutput> = {
  name: 'MovingAverage',
  async execute(
    conn: AsyncDuckDBConnection,
    input: MovingAverageInput,
  ): Promise<MovingAverageOutput> {
    const { frame, policy } = input

    // 1. fetch plan 導出
    const plan = buildTemporalFetchPlan(frame)

    // 2. DuckDB から requiredRange 分の rows を取得
    const fromKey = toDateKey(plan.requiredRange.from)
    const toKey = toDateKey(plan.requiredRange.to)
    const rows = await queryStoreDaySummary(conn, {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: frame.storeIds.length > 0 ? [...frame.storeIds] : undefined,
    })

    // 3. rows → DailySeriesSourceRow[]（adapter に委譲）
    // StoreDaySummaryRow は StoreDaySummaryRowForTemporal の上位集合
    const sourceRows = rows.map((r) => adaptStoreDaySummaryRow(r as StoreDaySummaryRowForTemporal))

    // 4. 連続日次系列構築
    const dailySeries = buildDailySeries(plan, sourceRows, frame.metric)

    // 5. 移動平均計算（domain 層の純粋関数）
    const maPoints = computeMovingAverage(dailySeries, frame.windowSize, policy)
    const maSeries: DailySeriesPoint[] = dailySeries.map((original, i) => ({
      ...original,
      value: maPoints[i].value,
      status: maPoints[i].status,
    }))

    // 6. anchorRange に切り戻し
    const anchorSeries = sliceToAnchorRange(maSeries, frame.anchorRange)

    return {
      anchorSeries,
      requiredMonths: plan.requiredMonths,
    }
  },
}
