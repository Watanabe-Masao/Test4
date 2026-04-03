/**
 * MovingAverageHandler — ���動平均 QueryHandler
 *
 * 責��は orchestration のみ:
 * 1. buildTemporalFetchPlan(frame) �� requiredRange/requiredMonths 導出
 * 2. queryStoreDaySummary(conn, params) で store×day rows 取得
 * 2.5. aggregateStoreDaySummaryByDateKey で dateKey 集約（日別合計の意味確定）
 * 3. adaptStoreDaySummaryRow で DailySeriesSourceRow[] 変換
 * 4. buildDailySeries(plan, sourceRows, frame.metric) で連続系列構築
 * 5. computeMovingAverage(series, frame.windowSize, policy) で計算
 * 6. anchorRange に切り戻し
 *
 * row adapter / metric 解釈は services/temporal/ に委譲。
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { QueryHandler } from '@/application/queries/QueryContract'
import type { PrevYearFlag } from '../comparisonQueryScope'
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
import { aggregateStoreDaySummaryByDateKey } from '@/application/services/temporal/aggregateStoreDaySummaryByDateKey'
import { computeMovingAverage } from '@/domain/calculations/temporal/computeMovingAverage'
import { queryStoreDaySummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import { toDateKey } from '@/domain/models/CalendarDate'
import type { DateRange } from '@/domain/models/CalendarDate'

// ── Input / Output ──

export interface MovingAverageInput {
  readonly frame: RollingAnalysisFrame
  readonly policy: MovingAverageMissingnessPolicy
  /** 前年データを取得する場合 true */
  readonly isPrevYear?: PrevYearFlag
  /** 追加メトリック（frame.metric に加えて計算する） */
  readonly extraMetrics?: readonly string[]
}

export interface MovingAverageOutput {
  readonly anchorSeries: readonly DailySeriesPoint[]
  readonly requiredMonths: readonly YearMonthKey[]
  /** extraMetrics の結果（key = metric名） */
  readonly extraSeries?: Readonly<Record<string, readonly DailySeriesPoint[]>>
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
      isPrevYear: input.isPrevYear ?? false,
    })

    // 2.5. store×day rows を dateKey 単位で集約（全店合計）
    // queryStoreDaySummary は store×day 単位で返すため、複数店舗選択時に
    // 同一 dateKey に複数行が存在する。series 構築前に日別合計の意味を確定する。
    const aggregatedRows = aggregateStoreDaySummaryByDateKey(
      rows.map((r) => r as StoreDaySummaryRowForTemporal),
    )

    // 3. rows → DailySeriesSourceRow[]（adapter に委譲）
    const sourceRows = aggregatedRows.map((r) => adaptStoreDaySummaryRow(r))

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

    // 7. extraMetrics（同じ sourceRows から追加メトリックの MA を計算）
    let extraSeries: Record<string, readonly DailySeriesPoint[]> | undefined
    if (input.extraMetrics && input.extraMetrics.length > 0) {
      extraSeries = {}
      for (const metric of input.extraMetrics) {
        const series = buildDailySeries(plan, sourceRows, metric)
        // extraMetrics always use 'partial' — their data sources may have gaps
        // (e.g. special_sales LEFT JOIN) per original design in commit 49fdedf
        const maExtra = computeMovingAverage(series, frame.windowSize, 'partial')
        const mapped: DailySeriesPoint[] = series.map((original, i) => ({
          ...original,
          value: maExtra[i].value,
          status: maExtra[i].status,
        }))
        extraSeries[metric] = sliceToAnchorRange(mapped, frame.anchorRange)
      }
    }

    return {
      anchorSeries,
      requiredMonths: plan.requiredMonths,
      extraSeries,
    }
  },
}
