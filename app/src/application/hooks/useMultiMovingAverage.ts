/**
 * useMultiMovingAverage — 複数指標 × 当年/前年の移動平均を一括取得
 *
 * IntegratedSalesChart の useState/useMemo ガード上限を回避するため、
 * 4つの useMovingAverageOverlay 呼び出しを1つの custom hook に集約。
 *
 * 返却:
 *   salesCur    — 当年売上7日MA
 *   salesPrev   — 前年売上7日MA
 *   metricCur   — 当年右軸指標7日MA（quantity/customers/discount）
 *   metricPrev  — 前年右軸指標7日MA
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { AnalysisMetric } from '@/domain/models/temporal'
import { useMovingAverageOverlay } from './useTemporalAnalysis'
import type { DailySeriesPoint } from '@/application/services/temporal/DailySeriesTypes'

export interface MovingAverageOverlays {
  readonly salesCur?: readonly DailySeriesPoint[]
  readonly salesPrev?: readonly DailySeriesPoint[]
  readonly metricCur?: readonly DailySeriesPoint[]
  readonly metricPrev?: readonly DailySeriesPoint[]
  readonly metricLabel?: string
}

const METRIC_LABELS: Record<string, string> = {
  quantity: '点数',
  customers: '客数',
  discount: '売変',
}

/**
 * @param secondaryMetric 右軸指標に対応する AnalysisMetric（null = MA なし）
 */
export function useMultiMovingAverage(
  executor: QueryExecutor | null,
  currentDateRange: DateRange,
  selectedStoreIds: ReadonlySet<string>,
  prevYearScope: PrevYearScope | undefined,
  secondaryMetric: AnalysisMetric | null,
  showMA: boolean,
): MovingAverageOverlays {
  const curScope = useMemo(
    () => ({ currentDateRange, selectedStoreIds }),
    [currentDateRange, selectedStoreIds],
  )

  const prevScope = useMemo(
    () => ({
      currentDateRange: prevYearScope?.dateRange as DateRange | undefined,
      selectedStoreIds,
    }),
    [prevYearScope, selectedStoreIds],
  )

  const hasPrev = prevYearScope != null
  const hasMetric = secondaryMetric != null && secondaryMetric !== 'sales'

  // 1. 当年売上MA
  const salesCurConfig = useMemo(
    () => ({ metric: 'sales' as const, windowSize: 7, policy: 'strict' as const }),
    [],
  )
  const { data: salesCurOut } = useMovingAverageOverlay(executor, curScope, showMA, salesCurConfig)

  // 2. 前年売上MA
  const salesPrevConfig = useMemo(
    () => ({
      metric: 'sales' as const,
      windowSize: 7,
      policy: 'strict' as const,
      isPrevYear: true,
    }),
    [],
  )
  const { data: salesPrevOut } = useMovingAverageOverlay(
    executor,
    prevScope,
    showMA && hasPrev,
    salesPrevConfig,
  )

  // 3. 当年右軸指標MA
  const metricCurConfig = useMemo(
    () => ({
      metric: (secondaryMetric ?? 'sales') as AnalysisMetric,
      windowSize: 7,
      policy: 'strict' as const,
    }),
    [secondaryMetric],
  )
  const { data: metricCurOut } = useMovingAverageOverlay(
    executor,
    curScope,
    showMA && hasMetric,
    metricCurConfig,
  )

  // 4. 前年右軸指標MA
  const metricPrevConfig = useMemo(
    () => ({
      metric: (secondaryMetric ?? 'sales') as AnalysisMetric,
      windowSize: 7,
      policy: 'strict' as const,
      isPrevYear: true,
    }),
    [secondaryMetric],
  )
  const { data: metricPrevOut } = useMovingAverageOverlay(
    executor,
    prevScope,
    showMA && hasMetric && hasPrev,
    metricPrevConfig,
  )

  return useMemo<MovingAverageOverlays>(
    () => ({
      salesCur: salesCurOut?.anchorSeries,
      salesPrev: salesPrevOut?.anchorSeries,
      metricCur: hasMetric ? metricCurOut?.anchorSeries : undefined,
      metricPrev: hasMetric ? metricPrevOut?.anchorSeries : undefined,
      metricLabel: secondaryMetric ? METRIC_LABELS[secondaryMetric] : undefined,
    }),
    [salesCurOut, salesPrevOut, metricCurOut, metricPrevOut, hasMetric, secondaryMetric],
  )
}
